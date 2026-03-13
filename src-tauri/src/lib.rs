use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::io::AsyncWriteExt;
use chrono::{Utc, NaiveDateTime, Duration};

fn skills_base_path() -> PathBuf {
    let home = dirs::home_dir().expect("Cannot determine home directory");
    home.join(".claude").join("skills")
}

fn history_base_path() -> PathBuf {
    let home = dirs::home_dir().expect("Cannot determine home directory");
    home.join(".skill-manager").join("history")
}

const GENERATE_SYSTEM_PROMPT: &str = r#"You are an expert at creating Claude Code skill files (SKILL.md).
Given a user's requirement description, generate a complete, well-structured SKILL.md file.

The SKILL.md file MUST follow this exact template structure:

1. **YAML Frontmatter** (required, between --- delimiters):
   - `name`: kebab-case skill identifier (e.g., `tdd-expert`, `code-reviewer`)
   - `description`: A concise one-line description of the skill's purpose, including when to use it.

2. **Markdown Body** (after the frontmatter):
   - A clear **Role** section defining who the AI should act as
   - A **Workflow** section with numbered steps or phases
   - Any **Coding Standards**, **Rules**, or **Constraints** the AI must follow
   - Concrete **Code Examples** demonstrating expected behavior

Output ONLY the SKILL.md content (frontmatter + markdown body), no explanations or wrapper text."#;

const REFINE_SYSTEM_PROMPT: &str = r#"You are an expert at editing Claude Code skill files (SKILL.md).
Given an existing SKILL.md and the user's edit instruction, produce the updated SKILL.md.
Preserve the overall structure (YAML frontmatter + markdown body) and only modify what the user requests.
Output ONLY the complete updated SKILL.md content, no explanations."#;

// Inline SDK script executed via `bun -e`. Reads JSON from stdin, calls CopilotClient, outputs JSON to stdout.
const COPILOT_SDK_SCRIPT: &str = r#"
import { CopilotClient, approveAll } from "@github/copilot-sdk";
const input = JSON.parse(await Bun.stdin.text());
let client, session;
try {
  client = new CopilotClient();
  session = await client.createSession({
    onPermissionRequest: approveAll,
    model: "gpt-4.1",
    systemMessage: { mode: "replace", content: input.systemPrompt },
  });
  const response = await session.sendAndWait({ prompt: input.prompt }, 120000);
  const content = response?.data?.content ?? "";
  if (!content.trim()) {
    console.log(JSON.stringify({ error: "Copilot returned an empty response." }));
  } else {
    console.log(JSON.stringify({ content }));
  }
} catch (error) {
  console.log(JSON.stringify({ error: error?.message || String(error) }));
} finally {
  if (session) await session.disconnect().catch(() => {});
  if (client) await client.stop().catch(() => {});
}
"#;

fn find_bun_path() -> String {
    if let Ok(output) = std::process::Command::new("which").arg("bun").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return path;
            }
        }
    }
    "bun".to_string()
}

async fn call_copilot_sdk(system_prompt: &str, prompt: &str) -> Result<String, String> {
    let bun = find_bun_path();

    let project_root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap_or(std::path::Path::new("."))
        .to_path_buf();

    let input = serde_json::json!({
        "systemPrompt": system_prompt,
        "prompt": prompt,
    });

    let mut child = tokio::process::Command::new(&bun)
        .arg("-e")
        .arg(COPILOT_SDK_SCRIPT)
        .current_dir(&project_root)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start bun: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        let input_bytes = serde_json::to_vec(&input).map_err(|e| e.to_string())?;
        stdin
            .write_all(&input_bytes)
            .await
            .map_err(|e| format!("Failed to write to stdin: {}", e))?;
        drop(stdin);
    }

    let output = child
        .wait_with_output()
        .await
        .map_err(|e| format!("SDK process failed: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if stdout.is_empty() {
        return Err(format!(
            "SDK process produced no output. stderr: {}",
            stderr
        ));
    }

    let result: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse SDK output: {}. Raw: {}", e, stdout))?;

    if let Some(error) = result.get("error").and_then(|e| e.as_str()) {
        return Err(error.to_string());
    }

    result
        .get("content")
        .and_then(|c| c.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "No content in SDK response".to_string())
}

#[tauri::command]
async fn generate_skill_content(requirement: String) -> Result<String, String> {
    call_copilot_sdk(GENERATE_SYSTEM_PROMPT, &requirement).await
}

#[tauri::command]
async fn refine_skill_content(
    existing_content: String,
    edit_instruction: String,
) -> Result<String, String> {
    let prompt = format!(
        "## Existing SKILL.md\n\n```\n{}\n```\n\n## Edit Instruction\n\n{}",
        existing_content, edit_instruction
    );
    call_copilot_sdk(REFINE_SYSTEM_PROMPT, &prompt).await
}

#[tauri::command]
fn skill_exists(name: String) -> Result<bool, String> {
    let path = skills_base_path().join(&name);
    Ok(path.is_dir())
}

#[tauri::command]
fn save_skill(name: String, content: String) -> Result<(), String> {
    let skill_file = skills_base_path().join(&name).join("SKILL.md");
    if skill_file.is_file() {
        if let Ok(old_content) = fs::read_to_string(&skill_file) {
            let _ = save_snapshot_impl(&name, &old_content);
        }
    }

    let dir = skills_base_path().join(&name);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join("SKILL.md"), &content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn read_skill(name: String) -> Result<String, String> {
    let path = skills_base_path().join(&name).join("SKILL.md");
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_skills() -> Result<Vec<String>, String> {
    let base = skills_base_path();
    if !base.is_dir() {
        return Ok(vec![]);
    }

    let kebab_re = regex::Regex::new(r"^[a-z0-9]+(-[a-z0-9]+)*$").unwrap();

    let mut results = Vec::new();
    let entries = fs::read_dir(&base).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        if !path.join("SKILL.md").is_file() {
            continue;
        }

        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if kebab_re.is_match(name) {
                results.push(name.to_string());
            }
        }
    }

    results.sort();
    Ok(results)
}

fn save_snapshot_impl(name: &str, content: &str) -> Result<(), String> {
    let dir = history_base_path().join(name);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let timestamp = Utc::now().format("%Y-%m-%dT%H-%M-%S").to_string();
    fs::write(dir.join(format!("{}.md", timestamp)), content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn save_skill_snapshot(name: String, content: String) -> Result<(), String> {
    save_snapshot_impl(&name, &content)
}

#[tauri::command]
fn list_skill_snapshots(name: String) -> Result<Vec<String>, String> {
    let dir = history_base_path().join(&name);
    if !dir.is_dir() {
        return Ok(vec![]);
    }

    // Cleanup: remove snapshots older than 7 days
    let cutoff = Utc::now() - Duration::days(7);
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("md") {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    if let Ok(dt) = NaiveDateTime::parse_from_str(stem, "%Y-%m-%dT%H-%M-%S") {
                        if dt < cutoff.naive_utc() {
                            let _ = fs::remove_file(&path);
                        }
                    }
                }
            }
        }
    }

    // List remaining snapshots
    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut timestamps: Vec<String> = entries
        .flatten()
        .filter_map(|entry| {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("md") {
                path.file_stem().and_then(|s| s.to_str().map(|s| s.to_string()))
            } else {
                None
            }
        })
        .collect();

    timestamps.sort();
    timestamps.reverse();
    Ok(timestamps)
}

#[tauri::command]
fn read_skill_snapshot(name: String, timestamp: String) -> Result<String, String> {
    let path = history_base_path().join(&name).join(format!("{}.md", timestamp));
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_skill(name: String) -> Result<(), String> {
    let path = skills_base_path().join(&name);
    fs::remove_dir_all(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            skill_exists,
            save_skill,
            read_skill,
            list_skills,
            delete_skill,
            generate_skill_content,
            refine_skill_content,
            save_skill_snapshot,
            list_skill_snapshots,
            read_skill_snapshot,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
