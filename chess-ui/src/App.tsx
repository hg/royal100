import React, { Fragment, useState } from "react";
import { HashRouter, Route, Switch } from "react-router-dom";
import ruRu from "antd/lib/locale-provider/ru_RU";
import { Alert, ConfigProvider } from "antd";
import { FullScreenWrap } from "./components/FullScreenWrap";
import { Spinner } from "./components/Spinner";
import { ChessBoard } from "./pages/ChessBoard";
import "moment/locale/ru";
import moment from "moment";
import { StartNewGame } from "./pages/StartNewGame";
import { routes } from "./pages/routes";
import { defaultConfig, SerializedState } from "./game/game";
import "./App.css";
import { useWasmCheck } from "./utils/wasm";

moment.locale("ru");

const suspenseFallback = (
  <FullScreenWrap>
    <Spinner loading />
  </FullScreenWrap>
);

const WasmUnsupported = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
    }}
  >
    <Alert
      showIcon
      type="error"
      message="Ваш браузер не поддерживается"
      description={
        <Fragment>
          Перейдите на последнюю версию
          <a href="https://firefox.com/"> Firefox </a>
          или <a href="https://google.com/chrome/"> Chrome</a>.
        </Fragment>
      }
    />
  </div>
);

function AppRoutes() {
  const [config, setConfig] = useState(defaultConfig);
  const [state, setState] = useState<SerializedState>();

  if (!useWasmCheck()) {
    return <WasmUnsupported />;
  }

  return (
    <Switch>
      <Route
        path={routes.chess}
        render={() => <ChessBoard config={config} state={state} />}
      />
      <Route
        exact
        path={routes.home}
        render={() => (
          <StartNewGame
            config={config}
            setConfig={setConfig}
            onLoadState={setState}
          />
        )}
      />
    </Switch>
  );
}

export const App = () => (
  <ConfigProvider locale={ruRu}>
    <HashRouter>
      <React.Suspense fallback={suspenseFallback}>
        <AppRoutes />
      </React.Suspense>
    </HashRouter>
  </ConfigProvider>
);
