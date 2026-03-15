import { BrowserRouter, Routes, Route } from "react-router";
import { Layout } from "./components/Layout";
import {
  Home,
  SkillList,
  CreateSkill,
  GenerateSkill,
  SkillDetail,
  SkillHistory,
  SkillAnalytics,
  SkillAnalyticsDetail,
} from "./pages";
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
            <Route path="analytics" element={<SkillAnalytics />} />
            <Route path="analytics/:name" element={<SkillAnalyticsDetail />} />
            <Route path="detail/:name" element={<SkillDetail />} />
            <Route path="history/:name" element={<SkillHistory />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
