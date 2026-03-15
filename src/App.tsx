import { BrowserRouter, Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import {
  CreateSkill,
  GenerateSkill,
  Home,
  MarketplaceBrowser,
  MarketplaceListingDetail,
  MarketplacePublish,
  SkillDetail,
  SkillHistory,
  SkillList,
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
            <Route path="marketplace" element={<MarketplaceBrowser />} />
            <Route path="marketplace/publish" element={<MarketplacePublish />} />
            <Route path="marketplace/listings/:skillName" element={<MarketplaceListingDetail />} />
            <Route path="detail/:name" element={<SkillDetail />} />
            <Route path="history/:name" element={<SkillHistory />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
