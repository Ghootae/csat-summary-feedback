import { useState } from "react";
import { Router as WouterRouter, Switch, Route } from "wouter";
import LoginPage from "@/pages/LoginPage";
import WorkspacePage from "@/pages/WorkspacePage";

function App() {
  const [userId, setUserId] = useState<string | null>(() => {
    return localStorage.getItem("coreader_user_id");
  });

  function handleLogin(id: string) {
    localStorage.setItem("coreader_user_id", id);
    setUserId(id);
  }

  function handleLogout() {
    localStorage.removeItem("coreader_user_id");
    setUserId(null);
  }

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Switch>
        <Route path="/">
          {userId ? (
            <WorkspacePage userId={userId} onLogout={handleLogout} />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )}
        </Route>
      </Switch>
    </WouterRouter>
  );
}

export default App;
