import { GameSettings, Settings } from "../GameSettings";
import { ControlPanel } from "../ControlPanel";
import { Game } from "../../../game/game";
import { observer } from "mobx-react-lite";
import React, { Fragment, useState } from "react";
import { StateSetter } from "../../../types";

interface Props {
  game: Game;
  settings: Settings;
  setSettings: StateSetter<Settings>;
}

export const LeftSidebar = observer<Props>(
  ({ game, settings, setSettings }) => {
    const [showSettings, setShowSettings] = useState(false);

    return (
      <Fragment>
        {showSettings && (
          <GameSettings
            value={settings}
            onSet={(next) => setSettings({ ...settings, ...next })}
            onHide={() => setShowSettings(false)}
          />
        )}

        <ControlPanel
          game={game}
          onShowSettings={() => setShowSettings(true)}
          onSet={(next) => setSettings({ ...settings, ...next })}
        />
      </Fragment>
    );
  }
);
