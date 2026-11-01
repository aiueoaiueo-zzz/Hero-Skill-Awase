import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { Footer } from "./components/Footer";
import { DataProvider } from "./lib/data";
import { About } from "./pages/About";
import { Detail } from "./pages/Detail";
import { Done } from "./pages/Done";
import { Home } from "./pages/Home";
import { Placeholder } from "./pages/Placeholder";
import { Status } from "./pages/Status";
import { Submit } from "./pages/Submit";
import { Targets } from "./pages/Targets";
import "./styles.css";

function Layout() {
  const { pathname, key } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);
  return (
    <>
      <Outlet />
      {!pathname.startsWith("/admin") && <Footer />}
    </>
  );
}

/** 同じ画面コンポーネントでも URL が変わったら作り直す（検索欄などをリセット） */
function Keyed({ children }: { children: React.ReactNode }) {
  const { pathname, search } = useLocation();
  return <div style={{ display: "contents" }} key={pathname + search}>{children}</div>;
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/h/:a" element={<Keyed><Targets /></Keyed>} />
        <Route path="/h/:a/:t" element={<Keyed><Detail /></Keyed>} />
        <Route path="/about" element={<About />} />
        <Route path="/submit" element={<Keyed><Submit /></Keyed>} />
        <Route path="/submit/done/:code" element={<Done />} />
        <Route path="/status" element={<Status />} />
        <Route path="/admin/*" element={<Placeholder title="管理画面" step={4} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <DataProvider>
        <App />
      </DataProvider>
    </BrowserRouter>
  </StrictMode>,
);
