import React, { useState } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import ruRu from "antd/lib/locale-provider/ru_RU";
import { ConfigProvider } from "antd";
import { FullScreenWrap } from "./components/FullScreenWrap";
import { Spinner } from "./components/Spinner";
import { ChessBoard } from "./pages/ChessBoard";
import "moment/locale/ru";
import moment from "moment";
import { StartNewGame } from "./pages/StartNewGame";
import { routes } from "./pages/routes";
import { GameConfig, OpponentType, UndoMove } from "./game/game";
import { depth } from "./utils/consts";
import "./App.css";
import { useWasmCheck } from "./utils/wasm";

moment.locale("ru");

const suspenseFallback = (
  <FullScreenWrap>
    <Spinner loading />
  </FullScreenWrap>
);

function AppRoutes() {
  const [config, setConfig] = useState<GameConfig>({
    myColor: "white",
    depth: depth.default,
    totalTime: 3600,
    opponent: OpponentType.Computer,
    undo: UndoMove.Single,
  });

  if (!useWasmCheck()) {
    return null;
  }

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
}

export const App = () => (
  <ConfigProvider locale={ruRu}>
    <BrowserRouter>
      <React.Suspense fallback={suspenseFallback}>
        <AppRoutes />
      </React.Suspense>
    </BrowserRouter>
  </ConfigProvider>
);
