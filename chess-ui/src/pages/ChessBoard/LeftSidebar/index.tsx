import { GameSettings, Settings } from "../GameSettings";
import { ControlPanel } from "../ControlPanel";
import { Game } from "../../../game/game";
import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { StateSetter } from "../../../types";

interface Props {
  game: Game;
  settings: Settings;
  setSettings: StateSetter<Settings>;
}

export const LeftSidebar = observer<Props>(
  ({ game, settings, setSettings }) => {
    const [showSettings, setShowSettings] = useState(false);

    return showSettings ? (
      <GameSettings
        value={settings}
        onSet={(next) => setSettings({ ...settings, ...next })}
        onHide={() => setShowSettings(false)}
      />
    ) : (
      <ControlPanel game={game} onShowSettings={() => setShowSettings(true)} />
    );
  }
);
