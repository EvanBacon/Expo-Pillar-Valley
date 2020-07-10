import { Renderer } from "expo-three";
import React from "react";
import {
  Clipboard,
  GestureResponderEvent,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeArea } from "react-native-safe-area-context";

import AchievementPopup from "../components/AchievementPopup";
import { AdMobBanner } from "../components/AdMob";
import Footer from "../components/Footer";
import GraphicsView, { GLEvent, ResizeEvent } from "../components/GraphicsView";
import Paused from "../components/Paused";
import ScoreMeta from "../components/ScoreMeta";
import Song from "../components/Song";
import TouchableView from "../components/TouchableView";
import Settings from "../constants/Settings";
import Game from "../Game/Game";
import useAppState from "../hooks/useAppState";

class GameState {
  game: Game | null = null;
  renderer: Renderer | null = null;

  onContextCreateAsync = async ({ gl, width, height, pixelRatio }: GLEvent) => {
    this.renderer = new Renderer({
      gl,
      width,
      height,
      pixelRatio,
    });

    this.game = new Game(width, height, this.renderer);
    await this.game.loadAsync();
  };

  onTouchesBegan = (state: GestureResponderEvent) => {
    if (this.game) {
      this.game.onTouchesBegan();
    }
  };

  onResize = (layout: ResizeEvent) => {
    const { scale } = layout;
    const width = layout.width;
    const height = layout.height;

    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
    if (this.game) {
      if (this.game.camera) {
        this.game.camera.aspect = width / height;
        this.game.camera.updateProjectionMatrix();
      }
    }
  };

  onRender = (delta: number, time: number) => {
    if (this.game) {
      this.game.update(delta, time);
      if (this.renderer) {
        this.renderer.render(this.game.scene, this.game.camera);
      }
    }
  };
}

const InputGameView = Settings.isSimulator ? SkipGameViewInSimulator : GameView;

function GameView({ onLoad, isPaused }) {
  const machine = React.useMemo(() => {
    if (Settings.isSimulator) return null;
    return new GameState();
  }, []);

  const onContextCreate = React.useCallback(
    async (props) => {
      if (machine) {
        await machine.onContextCreateAsync(props);
      }
      onLoad();
    },
    [onLoad, machine]
  );

  return (
    <TouchableView
      style={{
        flex: 1,
        overflow: "hidden",
      }}
      onTouchesBegan={machine?.onTouchesBegan}
    >
      <GraphicsView
        ref={(ref) => (global.gameRef = ref)}
        key="game"
        isPaused={isPaused}
        onContextCreate={onContextCreate}
        onRender={machine?.onRender}
        onResize={machine?.onResize}
      />
    </TouchableView>
  );
}

export default function GameScreen({ navigation }) {
  const [loading, setLoading] = React.useState(true);
  const appState = useAppState();
  const isPaused = appState !== "active";

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Song />
      <InputGameView onLoad={() => setLoading(false)} isPaused={isPaused} />
      <BottomBannerAd />
      <ScoreMeta />
      <Footer navigation={navigation} />
      {isPaused && <Paused />}

      {loading && (
        <Image
          style={StyleSheet.absoluteFill}
          source={require("../../icons/splash.png")}
        />
      )}
      <AchievementPopup navigation={navigation} />
    </View>
  );
}

function BottomBannerAd() {
  const [showAd, setShowAd] = React.useState<boolean>(false);
  const { bottom } = useSafeArea();

  const onBannerError = React.useCallback((errorDescription: string) => {
    console.log("Banner error: ", errorDescription);
    setShowAd(false);
  }, []);

  Clipboard.setString("");

  // Test ID, Replace with your-admob-unit-id
  const adUnitID = Platform.select({
    ios: "ca-app-pub-2312569320461549/6612342018",
    android: "ca-app-pub-2312569320461549/6685058859",
  });

  const display = showAd ? "flex" : "none";
  return (
    <View style={{ display, position: "absolute", bottom, left: 0, right: 0 }}>
      <AdMobBanner
        onAdViewDidReceiveAd={() => setShowAd(true)}
        bannerSize="smartBannerPortrait"
        adUnitID={adUnitID}
        servePersonalizedAds
        onDidFailToReceiveAdWithError={onBannerError}
      />
    </View>
  );
}
function SkipGameViewInSimulator({ onLoad }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "black",
        justifyContent: "center",
        alignItems: "center",
      }}
      ref={() => onLoad()}
    >
      <Text style={{ color: "white", fontSize: 36, textAlign: "center" }}>
        Graphics are disabled in the simulator
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    flex: 1,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFC266",
  },
});