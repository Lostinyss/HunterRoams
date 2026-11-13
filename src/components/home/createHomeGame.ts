import Phaser from "phaser";
import playerSheet from "@/sprites/Player.png";
import bed from "@/sprites/Bed.png";
import chest from "@/sprites/Chest.png";
import foodTable from "@/sprites/FoodTable.png";
import mapTable from "@/sprites/MapTable.png";

const WIDTH = 640;
const HEIGHT = 360;
const SPEED = 145;
const PLAYER_RADIUS = 9;
const FURNITURE_SCALE = 4;
// Explicit keys select the left (meat) and right (empty) cells of FoodTable.png.
const FOOD_FRAME = { served: "0", empty: "1" };

export const HOME_STATIONS = [
  { id: "bed", label: "Bed", x: 54, y: 82, width: 112, height: 64 },
  { id: "food", label: "Food Table", x: 498, y: 82, width: 40, height: 64 },
  { id: "chest", label: "Storage Chest", x: 84, y: 228, width: 56, height: 60 },
  { id: "map", label: "Map Table", x: 498, y: 228, width: 40, height: 64 },
] as const;

export type HomeStation = (typeof HOME_STATIONS)[number]["id"];
export type HomeDirection = "up" | "down" | "left" | "right";
type HomeInput = {
  held: ReadonlySet<HomeDirection>;
  interact: boolean;
  menuOpen: boolean;
  mealReady: boolean;
};

export function createHomeGame(
  parent: HTMLElement,
  input: HomeInput,
  onNearby: (station: HomeStation | null) => void,
  onInteract: (station: HomeStation) => void,
) {
  class HomeScene extends Phaser.Scene {
    private player!: Phaser.GameObjects.Sprite;
    private foodTable!: Phaser.GameObjects.Image;
    private prompt!: Phaser.GameObjects.Text;
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private interactKey?: Phaser.Input.Keyboard.Key;
    private nearby: HomeStation | null = null;

    preload() {
      this.load.spritesheet("home-player", playerSheet.src, { frameWidth: 32, frameHeight: 32 });
      this.load.image("home-bed", bed.src);
      this.load.image("home-chest", chest.src);
      this.load.image("home-map", mapTable.src);
      this.load.spritesheet("home-food", foodTable.src, { frameWidth: 16, frameHeight: 16 });
    }

    create() {
      const room = this.add.graphics();
      room.fillStyle(0x563e32).fillRect(18, 34, WIDTH - 36, HEIGHT - 52);
      for (let y = 48; y < HEIGHT - 18; y += 24) {
        room.fillStyle(0x654939).fillRect(18, y, WIDTH - 36, 2);
      }
      room.lineStyle(8, 0x382820).strokeRect(18, 34, WIDTH - 36, HEIGHT - 52);
      room.fillStyle(0x524f4f).fillRect(222, 150, 196, 136);
      room.lineStyle(3, 0x9d7e62).strokeRect(230, 158, 180, 120);

      for (const station of HOME_STATIONS) {
        const { x, y, width, height } = station;
        const furniture = this.add
          .image(
            x + width / 2,
            y + height,
            `home-${station.id}`,
            station.id === "food" ? this.foodFrame() : undefined,
          )
          .setOrigin(0.5, 1)
          .setScale(FURNITURE_SCALE)
          .setDepth(y + height);
        if (station.id === "food") {
          this.foodTable = furniture;
        }
        this.add.text(x + width / 2, y - 8, station.label, {
          fontSize: "14px",
          color: "#f7e6cc",
        }).setOrigin(0.5, 1).setDepth(HEIGHT);
      }

      this.anims.create({
        key: "home-walk",
        frames: this.anims.generateFrameNumbers("home-player", { start: 8, end: 11 }),
        frameRate: 8,
        repeat: -1,
      });
      this.player = this.add.sprite(WIDTH / 2, 300, "home-player", 0)
        .setOrigin(0.5, 1).setScale(2).setDepth(300);
      this.prompt = this.add.text(WIDTH / 2, HEIGHT - 6, "", {
        fontSize: "14px",
        color: "#f7e6cc",
        backgroundColor: "#2b201b",
        padding: { x: 8, y: 4 },
      }).setOrigin(0.5, 1).setDepth(HEIGHT + 1);
      this.cursors = this.input.keyboard?.createCursorKeys();
      this.interactKey = this.input.keyboard?.addKey("E");
    }

    update(_time: number, delta: number) {
      const foodFrame = this.foodFrame();
      if (String(this.foodTable.frame.name) !== foodFrame) this.foodTable.setFrame(foodFrame);

      const keyboardInteract = this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey);
      const interact = input.interact || keyboardInteract;
      input.interact = false;
      if (input.menuOpen) {
        this.player.anims.stop();
        this.player.setFrame(0);
        return;
      }

      const pressed = (key: HomeDirection) => Boolean(this.cursors?.[key].isDown || input.held.has(key));
      const dx = Number(pressed("right")) - Number(pressed("left"));
      const dy = Number(pressed("down")) - Number(pressed("up"));
      const { x, y } = this.player;
      if (dx || dy) {
        const step = SPEED * Math.min(delta, 50) / 1000 / Math.hypot(dx, dy);
        const nextX = Phaser.Math.Clamp(x + dx * step, 32, WIDTH - 32);
        const nextY = Phaser.Math.Clamp(y + dy * step, 65, HEIGHT - 30);
        if (!this.blocked(nextX, y)) this.player.x = nextX;
        if (!this.blocked(this.player.x, nextY)) this.player.y = nextY;
        if (dx) this.player.setFlipX(dx < 0);
      }
      if (x !== this.player.x || y !== this.player.y) {
        this.player.setDepth(this.player.y);
        this.player.play("home-walk", true);
      } else {
        this.player.anims.stop();
        this.player.setFrame(0);
      }

      let closest: (typeof HOME_STATIONS)[number] | undefined;
      let range = 30;
      for (const station of HOME_STATIONS) {
        const { x, y, width, height } = station;
        const distance = Math.hypot(
          this.player.x - Phaser.Math.Clamp(this.player.x, x, x + width),
          this.player.y - Phaser.Math.Clamp(this.player.y, y, y + height),
        );
        if (distance < range) {
          closest = station;
          range = distance;
        }
      }
      const nearby = closest?.id ?? null;
      if (nearby !== this.nearby) {
        this.nearby = nearby;
        this.prompt.setText(closest ? `E · Use ${closest.label}` : "");
        onNearby(nearby);
      }
      if (interact && nearby) onInteract(nearby);
    }

    private foodFrame() {
      return input.mealReady ? FOOD_FRAME.empty : FOOD_FRAME.served;
    }

    private blocked(x: number, y: number) {
      return HOME_STATIONS.some((station) =>
        x + PLAYER_RADIUS > station.x && x - PLAYER_RADIUS < station.x + station.width &&
        y + PLAYER_RADIUS > station.y && y - PLAYER_RADIUS < station.y + station.height,
      );
    }
  }

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WIDTH,
    height: HEIGHT,
    scene: HomeScene,
    backgroundColor: "#241b17",
    audio: { noAudio: true },
    render: { pixelArt: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
}
