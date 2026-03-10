import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/organisms";
import { DashboardPage, EligibilityPage, TiersPage, DistributionsPage } from "@/pages";

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/eligibility" element={<EligibilityPage />} />
          <Route path="/tiers" element={<TiersPage />} />
          <Route path="/distributions" element={<DistributionsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
