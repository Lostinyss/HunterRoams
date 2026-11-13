import Phaser from "phaser";
import { HuntMonster } from "./HuntMonster";
import { HuntPlayerSprite } from "./HuntPlayerSprite";
import { HuntWeapon, type Facing } from "./HuntWeapon";
import { MAX_HEALTH } from "@/lib/player-save";

export type HuntPlayerStats = {
  health: number;
  attackMultiplier: number;
  onHealthChange: (health: number) => void;
  onStart: () => void;
};

export class HuntScene extends Phaser.Scene {
  constructor(
    private readonly onDefeat: () => void,
    private readonly onVictoryExit: () => void,
    private readonly playerStats: HuntPlayerStats,
  ) {
    super("HuntScene");
    this.playerHealth = playerStats.health;
  }

  private player!: Phaser.GameObjects.Rectangle;
  private playerSprite!: HuntPlayerSprite;
  private playerFacing: Facing = 1;
  private sprintKey!: Phaser.Input.Keyboard.Key;
  private dashKey!: Phaser.Input.Keyboard.Key;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private dashFacing: Facing = 1;
  private dashUntil = 0;
  private nextDashAt = 0;
  private monster!: HuntMonster;
  private playerHealth: number;
  private playerHealthText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private weapon!: HuntWeapon;
  private leaving = false;

  preload() {
    HuntMonster.preload(this);
    HuntPlayerSprite.preload(this);
    HuntWeapon.preload(this);
  }

  create() {
    this.add
      .text(400, 80, "HUNTING ARENA", {
        fontSize: "32px",
        color: "#fbbf24",
      })
      .setOrigin(0.5);

    this.add
      .text(400, 120, "Arrows: move / jump  ·  Hold Z: charge  ·  Space: dash", {
        fontSize: "22px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.playerHealthText = this.add
      .text(400, 40, this.playerHealthLabel(), {
        fontSize: "18px",
        color: "#86efac",
      })
      .setOrigin(0.5);

    const keyboard = this.input.keyboard;

    if (!keyboard) {
      throw new Error("Keyboard input is unavailable");
    }
    this.attackKey = keyboard.addKey("Z");
    this.sprintKey = keyboard.addKey("SHIFT");
    this.dashKey = keyboard.addKey("SPACE");
    this.cursors = keyboard.createCursorKeys();

    this.player = this.add.rectangle(150, 250, 32, 48, 0x22c55e, 0);
    this.playerSprite = new HuntPlayerSprite(this, this.player);

    this.physics.add.existing(this.player);

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setCollideWorldBounds(true);

    this.weapon = new HuntWeapon(this, this.player);

    this.attackKey.on("down", () => {
      if (
        this.leaving ||
        this.playerHealth === 0 ||
        this.weapon.isAttacking ||
        this.time.now < this.dashUntil
      ) {
        return;
      }

      const { left, right } = this.cursors;
      const direction = left.isDown ? -1 : right.isDown ? 1 : 0;
      this.weapon.beginCharge(direction || this.playerFacing, direction !== 0);
    });

    this.attackKey.on("up", () => {
      if (this.leaving || this.playerHealth === 0) return;

      this.weapon.releaseCharge(this.monster.hurtbox, (damage) => {
        if (this.playerHealth > 0 && !this.leaving) {
          this.monster.takeDamage(Math.round(damage * this.playerStats.attackMultiplier));
        }
      });
    });

    const floor = this.add.rectangle(400, 420, 800, 40, 0x475569);

    this.physics.add.existing(floor, true);
    this.physics.add.collider(this.player, floor);

    this.monster = new HuntMonster(this, floor);

    this.statusText = this.add.text(20, 20, this.monster.status, {
      fontSize: "18px",
      color: "#ffffff",
    });
    this.playerStats.onStart();
  }

  private playerHealthLabel() {
    const boost = this.playerStats.attackMultiplier > 1 ? " · Attack boosted" : "";
    return `Player HP: ${this.playerHealth} / ${MAX_HEALTH}${boost}`;
  }

  update(_time: number, delta: number) {
    if (this.leaving) return;

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    if (this.playerHealth === 0) {
      this.playerSprite.showDefeat(this.playerFacing);
      return;
    }

    if (this.sprintKey.isDown && !this.weapon.isAttacking) {
      this.weapon.sheath(this.playerFacing);
    }

    const direction = this.cursors.left.isDown
      ? -1
      : this.cursors.right.isDown
        ? 1
        : 0;

    if (
      this.monster.defeated &&
      ((direction < 0 && playerBody.blocked.left) ||
        (direction > 0 && playerBody.blocked.right))
    ) {
      this.leaving = true;
      playerBody.setVelocityX(0);
      this.onVictoryExit();
      return;
    }

    const now = this.time.now;

    if (
      Phaser.Input.Keyboard.JustDown(this.dashKey) &&
      now >= this.nextDashAt &&
      !this.weapon.isCharging &&
      !this.weapon.isAttacking
    ) {
      this.dashFacing = direction || this.playerFacing;
      this.playerFacing = this.dashFacing;
      this.dashUntil = now + 160;
      this.nextDashAt = this.dashUntil + 300;
    }

    const isDashing = now < this.dashUntil;

    if (!isDashing && direction !== 0) {
      this.playerFacing = direction;
    }

    const walkSpeed = this.weapon.isDrawn
      ? 50
      : this.sprintKey.isDown
        ? 250
        : 180;
    let targetVelocity = direction * walkSpeed;

    if (isDashing) {
      targetVelocity = 420 * this.dashFacing;
    } else if (this.weapon.isMoving) {
      targetVelocity = 80 * this.weapon.attackFacing;
    } else if (this.weapon.isAttacking || this.attackKey.isDown) {
      targetVelocity = 0;
    }

    const currentVelocity = playerBody.velocity.x;
    const isBraking =
      currentVelocity * targetVelocity < 0 ||
      Math.abs(targetVelocity) < Math.abs(currentVelocity);

    const rate = isDashing
      ? 5000
      : isBraking
        ? 1800
        : this.weapon.isMoving
          ? 2400
          : 700;
    const difference = targetVelocity - currentVelocity;
    const maxChange = rate * (delta / 1000);

    playerBody.setVelocityX(
      currentVelocity +
        Math.sign(difference) * Math.min(Math.abs(difference), maxChange),
    );

    this.weapon.updatePose(this.playerFacing);

    if (this.cursors.up.isDown && playerBody.blocked.down) {
      playerBody.setVelocityY(-400);
    }

    const damage = this.monster.update(now, this.player);
    if (damage > 0) {
      this.playerHealth = Math.max(0, this.playerHealth - damage);
      this.playerStats.onHealthChange(this.playerHealth);
      this.playerHealthText.setText(this.playerHealthLabel());
      if (this.playerHealth === 0) {
        playerBody.setVelocityX(0);
        this.monster.stop();
        this.weapon.hideOnDefeat();
        this.playerSprite.showDefeat(this.playerFacing);
        this.statusText.setText("Hunt failed. Returning home…");
        this.time.delayedCall(1000, this.onDefeat);
        return;
      }
    }

    const attacking = this.weapon.isCharging || this.weapon.isAttacking;
    const movement = isDashing
      ? "dash"
      : !attacking && playerBody.blocked.down && Math.abs(playerBody.velocity.x) > 1
        ? "walk"
        : "idle";
    this.playerSprite.update(
      attacking ? this.weapon.attackFacing : this.playerFacing,
      this.weapon.isDrawn || attacking,
      movement,
    );

    this.statusText.setText(
      this.monster.defeated ? "Antelaur defeated. Walk to either edge to leave." : this.monster.status,
    );
    this.weapon.updateChargeColor();
  }
}
