import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Store, useStore } from "./store";
import Login from "./pages/Login";
import Layout from "./pages/Layout";
import EmailList from "./pages/EmailList";
import EmailDetail from "./pages/EmailDetail";
import Compose from "./pages/Compose";
import { ToastProvider } from "./components/ui";

function Guard({ children }) {
  const { user } = useStore();
  if (user === undefined) return <div className="splash">Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ToastProvider><Store>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Guard><Layout /></Guard>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<EmailList kind="scheduled" />} />
          <Route path="sent" element={<EmailList kind="sent" />} />
          <Route path="email/:id" element={<EmailDetail />} />
        </Route>
        <Route path="/compose" element={<Guard><Compose /></Guard>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Store></ToastProvider>
  );
}
