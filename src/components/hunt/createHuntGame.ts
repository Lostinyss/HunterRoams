import Phaser from "phaser";
import { HuntScene, type HuntPlayerStats } from "./HuntScene";

export function createHuntGame(
  parent: HTMLDivElement,
  onDefeat: () => void,
  onVictoryExit: () => void,
  playerStats: HuntPlayerStats,
) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: 800,
    height: 450,
    scene: new HuntScene(onDefeat, onVictoryExit, playerStats),
    parent,
    render: { pixelArt: true },
    audio: { noAudio: true },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 900 },
        debug: true,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });
}
