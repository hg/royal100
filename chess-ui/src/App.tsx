import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import ruRu from "antd/lib/locale-provider/ru_RU";
import { ConfigProvider } from "antd";
import { FullScreenWrap } from "./components/FullScreenWrap";
import { Spinner } from "./components/Spinner";
import { Home } from "./pages/Home";
import "moment/locale/ru";
import moment from "moment";

moment.locale("ru");

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

export const App = () => (
  <ConfigProvider locale={ruRu}>
    <BrowserRouter>
      <React.Suspense fallback={suspenseFallback}>
        <AppRoutes />
      </React.Suspense>
    </BrowserRouter>
  </ConfigProvider>
);
