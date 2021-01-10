import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import ruRu from "antd/lib/locale-provider/ru_RU";
import { ConfigProvider } from "antd";
import { FullScreenWrap } from "./components/FullScreenWrap";
import { Spinner } from "./components/Spinner";
import { Home } from "./pages/Home";

const suspenseFallback = (
  <FullScreenWrap>
    <Spinner loading />
  </FullScreenWrap>
);

const AppRoutes = () => (
  <Switch>
    <Route path="/" component={Home} />
  </Switch>
);

export function App() {
  return (
    <ConfigProvider locale={ruRu}>
      <BrowserRouter>
        <React.Suspense fallback={suspenseFallback}>
          <AppRoutes />
        </React.Suspense>
      </BrowserRouter>
    </ConfigProvider>
  );
}
