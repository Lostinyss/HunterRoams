import Phaser from "phaser";
import claymore from "@/sprites/Claymore.png";

export type Facing = 1 | -1;

const TEXTURE = "hunt-claymore";
const CHARGE_TINT = {
  low: 0xfdebc6,
  medium: 0xfdd3b1,
  high: 0xf9b4b4,
};
// The player sprite is on depth 0.
const SHEATHED_DEPTH = -1;
const DRAWN_DEPTH = 1;

export class HuntWeapon {
  isDrawn = false;
  isCharging = false;
  isAttacking = false;
  isMoving = false;
  attackFacing: Facing = 1;

  private readonly pivot: Phaser.GameObjects.Container;
  private readonly blade: Phaser.GameObjects.Container;
  private readonly bladeImage: Phaser.GameObjects.Image;
  private readonly hitbox: Phaser.GameObjects.Rectangle;
  private readonly maxChargeTime = 3000;
  private chargeStartTime = 0;
  private isThrust = false;

  static preload(scene: Phaser.Scene) {
    scene.load.image(TEXTURE, claymore.src);
  }

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Phaser.GameObjects.Rectangle,
  ) {
    this.pivot = scene.add.container(player.x, player.y).setVisible(false);
    this.blade = scene.add.container(0, 0);
    // The PNG points up and its guard is 24 pixels from the top.
    this.bladeImage = scene.add
      .image(0, 0, TEXTURE)
      .setOrigin(0.5, 24 / 32)
      .setRotation(Math.PI / 2)
      .setScale(3);
    this.hitbox = scene.add
      .rectangle(0, 0, 72, 14, 0xffffff, 0)
      .setOrigin(0, 0.5);
    this.blade.add([this.bladeImage, this.hitbox]);
    this.pivot.add(this.blade);
  }

  beginCharge(facing: Facing, isThrust: boolean) {
    this.isCharging = true;
    this.chargeStartTime = this.scene.time.now;
    this.attackFacing = facing;
    this.isThrust = isThrust;

    this.showAttackPose();
    this.blade
      .setPosition(isThrust ? -70 : 42, -8 * facing)
      .setVisible(true);
    this.bladeImage.setTint(CHARGE_TINT.low);
  }

  releaseCharge(
    monster: Phaser.GameObjects.Rectangle,
    onHit: (damage: number) => void,
  ) {
    if (!this.isCharging) return;

    const chargeTime = Math.min(
      this.scene.time.now - this.chargeStartTime,
      this.maxChargeTime,
    );
    this.isCharging = false;
    this.isDrawn = true;
    if (this.isAttacking) return;

    this.isAttacking = true;
    this.isMoving = true;
    let hasHitMonster = false;

    this.blade.setVisible(true);
    this.showAttackPose();
    this.blade.setPosition(this.isThrust ? -60 : 42, 0);

    const motion = this.isThrust
      ? { targets: this.blade, x: 42 }
      : {
          targets: this.pivot,
          rotation: this.attackFacing === 1 ? Math.PI * 0.05 : -Math.PI * 1.05,
        };

    this.scene.tweens.add({
      ...motion,
      duration: this.isThrust ? 50 : 250,
      ease: "Cubic.easeIn",
      onUpdate: () => {
        if (
          !hasHitMonster &&
          Phaser.Geom.Intersects.RectangleToRectangle(
            this.hitbox.getBounds(),
            monster.getBounds(),
          )
        ) {
          hasHitMonster = true;
          onHit(Math.round(10 + (chargeTime / this.maxChargeTime) * 20));
        }
      },
      onComplete: () => {
        this.isMoving = false;
        this.scene.time.delayedCall(500, () => {
          if (!this.isAttacking) return;

          this.isAttacking = false;
          this.bladeImage.clearTint();
          this.setDrawnPose(this.attackFacing);
        });
      },
    });
  }

  hideOnDefeat() {
    this.isCharging = false;
    this.isAttacking = false;
    this.isMoving = false;
    this.isDrawn = false;
    this.scene.tweens.killTweensOf([this.pivot, this.blade]);
    this.pivot.setVisible(false);
  }

  sheath(facing: Facing) {
    this.isDrawn = false;
    if (this.isCharging) return;

    this.setSheathedPose(facing);
    this.pivot.setVisible(true);
    this.blade.setVisible(true);
  }

  updatePose(facing: Facing) {
    if (this.isCharging || this.isAttacking) {
      const waistOffset = this.isCharging && this.isThrust ? 8 : 0;
      this.pivot.setPosition(this.player.x, this.player.y + waistOffset);
    } else if (this.isDrawn) {
      this.setDrawnPose(facing);
    } else if (this.pivot.visible) {
      this.setSheathedPose(facing);
    }
  }

  updateChargeColor() {
    if (!this.isCharging || this.isAttacking) return;

    const ratio = Math.min(
      (this.scene.time.now - this.chargeStartTime) / this.maxChargeTime,
      1,
    );
    this.bladeImage.setTint(
      ratio < 0.33
        ? CHARGE_TINT.low
        : ratio < 0.66
          ? CHARGE_TINT.medium
          : CHARGE_TINT.high,
    );
  }

  private showAttackPose() {
    const facingRight = this.attackFacing === 1;
    const rotation = this.isThrust
      ? (facingRight ? 0 : Math.PI)
      : (facingRight ? -Math.PI * 0.9 : -Math.PI * 0.05);

    this.pivot
      .setDepth(DRAWN_DEPTH)
      .setPosition(this.player.x, this.player.y + (this.isThrust ? 8 : 0))
      .setRotation(rotation)
      .setVisible(true);
  }

  private setDrawnPose(facing: Facing) {
    const tilt = Math.PI * 0.075;

    this.pivot
      .setDepth(DRAWN_DEPTH)
      .setPosition(this.player.x + facing * 10, this.player.y)
      .setRotation(facing === 1 ? tilt : Math.PI - tilt);
    this.blade.setPosition(0, 0);
  }

  private setSheathedPose(facing: Facing) {
    this.pivot
      .setDepth(SHEATHED_DEPTH)
      .setPosition(this.player.x + facing * 10, this.player.y - 40)
      .setRotation(facing === 1 ? Math.PI * 0.75 : Math.PI * 0.25);
    this.blade.setPosition(0, 0);
  }
}
