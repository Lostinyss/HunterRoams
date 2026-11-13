import Phaser from "phaser";
import playerSheet from "@/sprites/Player.png";
import type { Facing } from "./HuntWeapon";

const TEXTURE = "hunt-player";
const SCALE = 2;

// Four columns of 32×32 cells. Death is the first cell of the last row.
const FRAMES = {
  sheathedIdle: 0,
  sheathedDash: 4,
  sheathedWalk: [8, 9, 10, 11],
  drawnIdle: 12,
  drawnDash: 16,
  drawnWalk: [20, 21],
  death: 24,
};

export class HuntPlayerSprite {
  private readonly sprite: Phaser.GameObjects.Sprite;

  static preload(scene: Phaser.Scene) {
    scene.load.spritesheet(TEXTURE, playerSheet.src, {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  constructor(
    scene: Phaser.Scene,
    private readonly player: Phaser.GameObjects.Rectangle,
  ) {
    this.sprite = scene.add
      .sprite(player.x, player.y + player.height / 2, TEXTURE, FRAMES.sheathedIdle)
      .setOrigin(0.5, 1)
      .setScale(SCALE);
    this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    for (const [key, frames] of [
      ["player-sheathed-walk", FRAMES.sheathedWalk],
      ["player-drawn-walk", FRAMES.drawnWalk],
    ] as const) {
      if (scene.anims.exists(key)) continue;

      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(TEXTURE, { frames }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  update(
    facing: Facing,
    drawn: boolean,
    movement: "idle" | "walk" | "dash",
  ) {
    this.syncPosition(facing);

    if (movement === "walk") {
      this.sprite.play(drawn ? "player-drawn-walk" : "player-sheathed-walk", true);
      return;
    }

    this.sprite.anims.stop();
    const idleFrame = drawn ? FRAMES.drawnIdle : FRAMES.sheathedIdle;
    const dashFrame = drawn ? FRAMES.drawnDash : FRAMES.sheathedDash;
    this.sprite.setFrame(movement === "dash" ? dashFrame : idleFrame);
  }

  showDefeat(facing: Facing) {
    this.syncPosition(facing);
    this.sprite.anims.stop();
    this.sprite.setFrame(FRAMES.death);
  }

  private syncPosition(facing: Facing) {
    this.sprite
      .setPosition(this.player.x, this.player.y + this.player.height / 2)
      .setFlipX(facing === -1);
  }
}
