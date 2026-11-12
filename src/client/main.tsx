import { StrictMode, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { Footer } from "./components/Footer";
import { ShareSheet } from "./components/ShareSheet";
import { DataProvider } from "./lib/data";
import { About } from "./pages/About";
import { Contact } from "./pages/Contact";
import { Ranking } from "./pages/Ranking";
import { User } from "./pages/User";
import { Detail } from "./pages/Detail";
import { Done } from "./pages/Done";
import { Home } from "./pages/Home";
import { AdminContacts } from "./pages/admin/AdminContacts";
import { AdminEvents } from "./pages/admin/AdminEvents";
import { AdminHeroes } from "./pages/admin/AdminHeroes";
import { AdminPending } from "./pages/admin/AdminPending";
import { AdminPublished } from "./pages/admin/AdminPublished";
import { AdminSettings } from "./pages/admin/AdminSettings";
import { Status } from "./pages/Status";
import { Submit } from "./pages/Submit";
import { Targets } from "./pages/Targets";
import { Terms } from "./pages/Terms";
import "./styles.css";

function Layout() {
  const { pathname, key } = useLocation();
  // 画面が切り替わったら先頭へ（描画の前に移動して、前の画面の位置で一瞬表示されないようにする）
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);
  return (
    <>
      <Outlet />
      {!pathname.startsWith("/admin") && <Footer />}
      <ShareSheet />
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
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/u/:xid" element={<Keyed><User /></Keyed>} />
        <Route path="/submit" element={<Keyed><Submit /></Keyed>} />
        <Route path="/submit/done/:code" element={<Done />} />
        <Route path="/status" element={<Status />} />
        <Route path="/admin" element={<AdminPending />} />
        <Route path="/admin/published" element={<AdminPublished />} />
        <Route path="/admin/contacts" element={<AdminContacts />} />
        <Route path="/admin/heroes" element={<AdminHeroes />} />
        <Route path="/admin/events" element={<AdminEvents />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
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
