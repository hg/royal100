import { Button } from "antd";
import { observer } from "mobx-react-lite";
import { themeManager } from "../../themes/themes";
import { RiMoonClearLine } from "react-icons/ri";
import { TiAdjustBrightness } from "react-icons/ti";

export const ThemeButton = observer(() => (
  <Button shape="circle" onClick={themeManager.toggle} title="Переключить тему">
    {themeManager.theme === "light" ? (
      <RiMoonClearLine className="icon-float" />
    ) : (
      <TiAdjustBrightness  className="icon-float" />
    )}
  </Button>
));
