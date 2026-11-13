import Phaser from "phaser";
import antelaurSheet from "@/sprites/Antelaur.png";
import type { Facing } from "./HuntWeapon";

const ANTELAUR = {
  scale: 2,
  health: 100,
  approachSpeed: 100,
  windupRange: 145,
  windupMs: 600,
  lungeSpeed: 470,
  lungeMs: 320,
  recoveryMs: 1000,
  damage: 20,
};

const TEXTURE = "antelaur";

// The export uses four columns of 96×96 cells, with blank cells between rows.
const FRAMES = {
  idle: 0,
  death: 4,
  walk: [8, 9, 10, 11],
  windup: [12, 13, 14],
  charged: [16, 17],
};

type MonsterPhase = "neutral" | "approach" | "windup" | "lunge" | "recovery" | "defeated";

export class HuntMonster {
  readonly hurtbox: Phaser.GameObjects.Rectangle;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly body: Phaser.Physics.Arcade.Body;
  private readonly bite: Phaser.GameObjects.Rectangle;
  private phase: MonsterPhase = "neutral";
  private phaseEndsAt = 0;
  private facing: Facing = -1;
  private hasHitPlayer = false;
  private health = ANTELAUR.health;

  static preload(scene: Phaser.Scene) {
    scene.load.spritesheet(TEXTURE, antelaurSheet.src, {
      frameWidth: 96,
      frameHeight: 96,
    });
  }

  constructor(scene: Phaser.Scene, floor: Phaser.GameObjects.Rectangle) {
    const { scale } = ANTELAUR;
    const hurtboxHeight = 54 * scale;
    const floorTop = floor.getBounds().top;

    this.hurtbox = scene.add.rectangle(
      600,
      floorTop - hurtboxHeight / 2,
      44 * scale,
      hurtboxHeight,
      0xdc2626,
      0,
    );
    this.sprite = scene.add
      .sprite(600, floorTop, TEXTURE, FRAMES.idle)
      .setOrigin(0.5, 1)
      .setScale(scale);
    this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    const animations = [
      { name: "walk", frames: FRAMES.walk, duration: 500, repeat: -1 },
      { name: "windup", frames: FRAMES.windup, duration: ANTELAUR.windupMs },
      { name: "charged", frames: FRAMES.charged, duration: ANTELAUR.lungeMs, repeat: -1 },
      { name: "recovery", frames: [...FRAMES.windup].reverse(), duration: ANTELAUR.recoveryMs },
    ];

    for (const { name, frames, duration, repeat = 0 } of animations) {
      const key = `${TEXTURE}-${name}`;
      if (scene.anims.exists(key)) continue;

      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(TEXTURE, { frames }),
        duration,
        repeat,
      });
    }

    this.syncSprite();
    scene.physics.add.existing(this.hurtbox);
    this.body = this.hurtbox.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    scene.physics.add.collider(this.hurtbox, floor);

    this.bite = scene.add.rectangle(0, 0, 30 * scale, 24 * scale, 0xfb7185, 0.35);
    this.bite.setVisible(false);
  }

  get defeated() {
    return this.phase === "defeated";
  }

  get status() {
    const phaseLabels = {
      neutral: "Neutral · Attacks if hit",
      approach: "Approaching",
      windup: "Winding up!",
      lunge: "Lunging!",
      recovery: "Recovering",
      defeated: "Defeated",
    };

    return `Antelaur HP: ${this.health} / ${ANTELAUR.health} · ${phaseLabels[this.phase]}`;
  }

  takeDamage(damage: number) {
    if (this.defeated || damage <= 0) return;

    this.health = Math.max(0, this.health - damage);
    if (this.health === 0) {
      this.phase = "defeated";
      this.sprite.anims.stop();
      this.sprite.setFrame(FRAMES.death);
      this.stop();
    } else if (this.phase === "neutral") {
      this.phase = "approach";
    }
  }

  stop() {
    this.body.setVelocityX(0);
    this.bite.setVisible(false);
  }

  update(now: number, player: Phaser.GameObjects.Rectangle): number {
    this.syncSprite();

    switch (this.phase) {
      case "approach": {
        const distanceX = player.x - this.hurtbox.x;
        if (distanceX !== 0) this.facing = distanceX < 0 ? -1 : 1;
        this.syncSprite();

        if (Math.abs(distanceX) <= ANTELAUR.windupRange) {
          this.phase = "windup";
          this.phaseEndsAt = now + ANTELAUR.windupMs;
          this.body.setVelocityX(0);
          this.sprite.play("antelaur-windup");
        } else {
          this.body.setVelocityX(this.facing * ANTELAUR.approachSpeed);
          this.sprite.play("antelaur-walk", true);
        }
        break;
      }

      case "windup":
        if (now >= this.phaseEndsAt) {
          this.phase = "lunge";
          this.phaseEndsAt = now + ANTELAUR.lungeMs;
          this.hasHitPlayer = false;
          this.sprite.play("antelaur-charged");
          this.body.setVelocityX(this.facing * ANTELAUR.lungeSpeed);
          return this.checkBite(player);
        }
        break;

      case "lunge": {
        const damage = this.checkBite(player);
        if (now >= this.phaseEndsAt) {
          this.phase = "recovery";
          this.phaseEndsAt = now + ANTELAUR.recoveryMs;
          this.sprite.play("antelaur-recovery");
          this.stop();
        }
        return damage;
      }

      case "recovery":
        if (now >= this.phaseEndsAt) {
          this.phase = "approach";
          this.sprite.anims.stop();
          this.sprite.setFrame(FRAMES.idle);
        }
        break;

      case "neutral":
      case "defeated":
        break;
    }

    return 0;
  }

  private syncSprite() {
    // The sheet faces left and its torso sits slightly left of frame center.
    this.sprite
      .setFlipX(this.facing === 1)
      .setPosition(
        this.hurtbox.x - this.facing * 6 * ANTELAUR.scale,
        this.hurtbox.y + this.hurtbox.height / 2,
      );
  }

  private checkBite(player: Phaser.GameObjects.Rectangle) {
    const reach = 32 * ANTELAUR.scale;
    this.bite
      .setPosition(
        this.hurtbox.x + this.facing * reach,
        this.hurtbox.y + 10 * ANTELAUR.scale,
      )
      .setVisible(true);

    if (
      this.hasHitPlayer ||
      !Phaser.Geom.Intersects.RectangleToRectangle(
        this.bite.getBounds(),
        player.getBounds(),
      )
    ) {
      return 0;
    }

    this.hasHitPlayer = true;
    return ANTELAUR.damage;
  }
}
