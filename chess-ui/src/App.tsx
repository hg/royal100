import React, { useState } from "react";
import { HashRouter, Route, Switch } from "react-router-dom";
import ruRu from "antd/lib/locale-provider/ru_RU";
import { ConfigProvider } from "antd";
import { FullScreenWrap } from "./components/FullScreenWrap";
import { Spinner } from "./components/Spinner";
import { ChessBoard } from "./pages/ChessBoard";
import "moment/locale/ru";
import moment from "moment";
import { StartNewGame } from "./pages/StartNewGame";
import { routes } from "./pages/routes";
import { GameConfig, OpponentType } from "./game/game";
import { depth } from "./utils/consts";

moment.locale("ru");

const suspenseFallback = (
  <FullScreenWrap>
    <Spinner loading />
  </FullScreenWrap>
);

const AppRoutes = () => {
  const [config, setConfig] = useState<GameConfig>({
    myColor: "white",
    depth: depth.default,
    totalTime: 3600,
    opponent: OpponentType.Computer,
    rotateBoard: false,
  });

  return (
    <Switch>
      <Route
        path={routes.chess}
        render={() => <ChessBoard config={config} />}
      />
      <Route
        exact
        path={routes.home}
        render={() => <StartNewGame config={config} setConfig={setConfig} />}
      />
    </Switch>
  );
};

export const App = () => (
  <ConfigProvider locale={ruRu}>
    <HashRouter>
      <React.Suspense fallback={suspenseFallback}>
        <AppRoutes />
      </React.Suspense>
    </HashRouter>
  </ConfigProvider>
);
