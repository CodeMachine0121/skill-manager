import { BrowserRouter, Routes, Route } from "react-router";
import { Layout } from "./components/Layout";
import { Home, SkillList, CreateSkill, GenerateSkill, SkillDetail } from "./pages";
import { AppContext, useCases } from "./infrastructure/context";

function App() {
  return (
    <AppContext.Provider value={useCases}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="skills" element={<SkillList />} />
            <Route path="create" element={<CreateSkill />} />
            <Route path="generate" element={<GenerateSkill />} />
            <Route path="detail/:name" element={<SkillDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
