use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;
use std::process::Stdio;

use chrono::{Duration, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use tokio::io::AsyncWriteExt;

fn skills_base_path() -> PathBuf {
    let home = dirs::home_dir().expect("Cannot determine home directory");
    home.join(".claude").join("skills")
}

fn history_base_path() -> PathBuf {
    let home = dirs::home_dir().expect("Cannot determine home directory");
    home.join(".skill-manager").join("history")
}

fn marketplace_base_path() -> PathBuf {
    let home = dirs::home_dir().expect("Cannot determine home directory");
    home.join(".skill-manager").join("marketplace")
}

fn marketplace_storage_path() -> PathBuf {
    marketplace_base_path().join("listings.json")
}

fn skill_metadata_path(name: &str) -> PathBuf {
    skills_base_path().join(name).join(".skill-manager.json")
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct MarketplaceOriginRecord {
    listing_id: String,
    version: String,
    share_link: String,
    publisher_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct StoredSkillMetadata {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    marketplace: Option<MarketplaceOriginRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredSkillRecord {
    content: String,
    #[serde(default)]
    metadata: StoredSkillMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SkillSummaryRecord {
    name: String,
    #[serde(default)]
    metadata: StoredSkillMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MarketplaceReleaseRecord {
    version: String,
    #[serde(default)]
    release_notes: String,
    content: String,
    published_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MarketplaceListingRecord {
    skill_name: String,
    summary: String,
    tags: Vec<String>,
    publisher_id: String,
    releases: Vec<MarketplaceReleaseRecord>,
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
fn save_skill(name: String, content: String, metadata: StoredSkillMetadata) -> Result<(), String> {
    let skill_file = skills_base_path().join(&name).join("SKILL.md");
    if skill_file.is_file() {
        if let Ok(old_content) = fs::read_to_string(&skill_file) {
            let _ = save_snapshot_impl(&name, &old_content);
        }
    }

    let dir = skills_base_path().join(&name);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join("SKILL.md"), &content).map_err(|e| e.to_string())?;
    write_skill_metadata(&name, &metadata)?;
    Ok(())
}

#[tauri::command]
fn read_skill(name: String) -> Result<StoredSkillRecord, String> {
    let path = skills_base_path().join(&name).join("SKILL.md");
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(StoredSkillRecord {
        content,
        metadata: read_skill_metadata_or_default(&name),
    })
}

#[tauri::command]
fn list_skills() -> Result<Vec<String>, String> {
    collect_skill_names()
}

#[tauri::command]
fn list_skill_summaries() -> Result<Vec<SkillSummaryRecord>, String> {
    let mut summaries: Vec<SkillSummaryRecord> = collect_skill_names()?
        .into_iter()
        .map(|name| SkillSummaryRecord {
            metadata: read_skill_metadata_or_default(&name),
            name,
        })
        .collect();

    summaries.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(summaries)
}

fn collect_skill_names() -> Result<Vec<String>, String> {
    let base = skills_base_path();
    if !base.is_dir() {
        return Ok(vec![]);
    }

    let kebab_re = regex::Regex::new(r"^[a-z0-9]+(-[a-z0-9]+)*$").unwrap();
    let entries = fs::read_dir(&base).map_err(|e| e.to_string())?;
    let mut results = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if !path.is_dir() || !path.join("SKILL.md").is_file() {
            continue;
        }

        if let Some(name) = path.file_name().and_then(|value| value.to_str()) {
            if kebab_re.is_match(name) {
                results.push(name.to_string());
            }
        }
    }

    results.sort();
    Ok(results)
}

fn read_skill_metadata_or_default(name: &str) -> StoredSkillMetadata {
    let path = skill_metadata_path(name);

    if !path.is_file() {
        return StoredSkillMetadata::default();
    }

    fs::read_to_string(&path)
        .ok()
        .and_then(|content| serde_json::from_str::<StoredSkillMetadata>(&content).ok())
        .unwrap_or_default()
}

fn write_skill_metadata(name: &str, metadata: &StoredSkillMetadata) -> Result<(), String> {
    let path = skill_metadata_path(name);

    if metadata.marketplace.is_none() {
        if path.is_file() {
            match fs::remove_file(&path) {
                Ok(_) => return Ok(()),
                Err(error) if error.kind() == ErrorKind::NotFound => return Ok(()),
                Err(error) => return Err(error.to_string()),
            }
        }

        return Ok(());
    }

    let json = serde_json::to_string_pretty(metadata).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
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

    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut timestamps: Vec<String> = entries
        .flatten()
        .filter_map(|entry| {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("md") {
                path.file_stem()
                    .and_then(|s| s.to_str().map(|value| value.to_string()))
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

#[tauri::command]
fn list_marketplace_listings() -> Result<Vec<MarketplaceListingRecord>, String> {
    let mut listings = read_marketplace_listings()?;
    listings.sort_by(|left, right| left.skill_name.cmp(&right.skill_name));
    Ok(listings)
}

#[tauri::command]
fn read_marketplace_listing(name: String) -> Result<Option<MarketplaceListingRecord>, String> {
    let listings = read_marketplace_listings()?;
    Ok(listings.into_iter().find(|listing| listing.skill_name == name))
}

#[tauri::command]
fn save_marketplace_listing(listing: MarketplaceListingRecord) -> Result<(), String> {
    let mut listings = read_marketplace_listings()?;

    if let Some(index) = listings
        .iter()
        .position(|current_listing| current_listing.skill_name == listing.skill_name)
    {
        listings[index] = listing;
    } else {
        listings.push(listing);
    }

    listings.sort_by(|left, right| left.skill_name.cmp(&right.skill_name));
    write_marketplace_listings(&listings)
}

fn read_marketplace_listings() -> Result<Vec<MarketplaceListingRecord>, String> {
    let path = marketplace_storage_path();

    if !path.is_file() {
        return Ok(vec![]);
    }

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;

    if content.trim().is_empty() {
        return Ok(vec![]);
    }

    serde_json::from_str::<Vec<MarketplaceListingRecord>>(&content).map_err(|e| e.to_string())
}

fn write_marketplace_listings(listings: &[MarketplaceListingRecord]) -> Result<(), String> {
    fs::create_dir_all(marketplace_base_path()).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(listings).map_err(|e| e.to_string())?;
    fs::write(marketplace_storage_path(), json).map_err(|e| e.to_string())
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
            list_skill_summaries,
            delete_skill,
            generate_skill_content,
            refine_skill_content,
            save_skill_snapshot,
            list_skill_snapshots,
            read_skill_snapshot,
            list_marketplace_listings,
            read_marketplace_listing,
            save_marketplace_listing,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
