import Phaser from "phaser";
import playerSheet from "@/sprites/Player.png";
import antelaurSheet from "@/sprites/Antelaur.png";
import type { Encounter } from "@/lib/hunting_ground";

const WIDTH = 640;
const HEIGHT = 360;
const EDGE = 20;
const TOP_EDGE = 64;
const DOOR_HALF_WIDTH = 38;
const CONTACT_RADIUS = 28;
const WALK_SPEED = 145;
const RUN_SPEED = 230;
const DASH_SPEED = 420;
const DASH_DURATION = 160;
const DASH_COOLDOWN = 300;

export type Direction = "up" | "left" | "down" | "right";
export type ScoutingPosition = { room: string; x: number; y: number };
export type ScoutingTouchInput = {
  held: Set<Direction | "run">;
  dashRequested: boolean;
};

const ROOMS = [
  { x: 0, y: 0, name: "Marsh Entrance" },
  { x: 1, y: 0, name: "Reed Bank" },
  { x: 2, y: 0, name: "Stillwater" },
  { x: 2, y: -1, name: "Silt Crossing" },
  { x: 3, y: -1, name: "Hollow Creek" },
];

const DOORS = {
  up: { dx: 0, dy: -1, label: "North" },
  down: { dx: 0, dy: 1, label: "South" },
  left: { dx: -1, dy: 0, label: "West" },
  right: { dx: 1, dy: 0, label: "East" },
} satisfies Record<Direction, { dx: number; dy: number; label: string }>;

const DOOR_DIRECTIONS = Object.keys(DOORS) as Direction[];

const ROAM_STEPS = [
  { x: 480, y: 166 },
  { x: 480, y: 258 },
  { x: 338, y: 258 },
  { x: 338, y: 166 },
];

export function createScoutingGame(
  parent: HTMLElement,
  encounters: readonly Encounter[],
  onEncounter: (encounter: Encounter, position: ScoutingPosition) => void,
  touchInput: ScoutingTouchInput,
  onReturnHome: () => void,
  returnPosition?: ScoutingPosition,
) {
  const encountersByRoom = new Map(
    encounters.map((encounter) => [encounter.zoneName, encounter]),
  );

  class ScoutingScene extends Phaser.Scene {
    private roomIndex = 0;
    private leaving = false;
    private field!: Phaser.GameObjects.Graphics;
    private roomLabel!: Phaser.GameObjects.Text;
    private prompt!: Phaser.GameObjects.Text;
    private player!: Phaser.GameObjects.Sprite;
    private monster!: Phaser.GameObjects.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private facing = new Phaser.Math.Vector2(1, 0);
    private dashDirection = new Phaser.Math.Vector2();
    private dashUntil = 0;
    private nextDashAt = 0;
    private roamStep = 0;
    private waitUntil = 0;

    preload() {
      this.load.spritesheet("scout-player", playerSheet.src, {
        frameWidth: 32,
        frameHeight: 32,
      });
      this.load.spritesheet("scout-antelaur", antelaurSheet.src, {
        frameWidth: 96,
        frameHeight: 96,
      });
    }

    create() {
      this.field = this.add.graphics();
      this.roomLabel = this.add.text(24, 20, "", { color: "#ecf0dc" });
      this.prompt = this.add.text(WIDTH / 2, HEIGHT - 16, "", {
        color: "#ecf0dc",
        backgroundColor: "#172721",
        padding: { x: 8, y: 4 },
      }).setOrigin(0.5, 1).setDepth(HEIGHT + 1);

      this.anims.create({
        key: "scout-player-walk",
        frames: this.anims.generateFrameNumbers("scout-player", { start: 8, end: 11 }),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: "scout-antelaur-walk",
        frames: this.anims.generateFrameNumbers("scout-antelaur", { start: 8, end: 11 }),
        frameRate: 8,
        repeat: -1,
      });

      this.player = this.add.sprite(100, HEIGHT / 2, "scout-player", 0)
        .setOrigin(0.5, 1).setScale(2);
      if (returnPosition) {
        const room = ROOMS.findIndex(({ name }) => name === returnPosition.room);
        if (room >= 0) {
          this.roomIndex = room;
          this.player.setPosition(
            Phaser.Math.Clamp(returnPosition.x, EDGE, WIDTH - EDGE),
            Phaser.Math.Clamp(returnPosition.y, TOP_EDGE, HEIGHT - EDGE),
          );
        }
      }
      this.monster = this.add.sprite(338, 166, "scout-antelaur", 0)
        .setOrigin(0.5, 1);

      const keyboard = this.input.keyboard;
      if (keyboard) {
        this.cursors = keyboard.createCursorKeys();
      }
      this.drawRoom();
    }

    update(time: number, delta: number) {
      if (this.leaving) return;

      const pressed = (key: Direction) =>
        this.cursors?.[key].isDown || touchInput.held.has(key);
      const dx = Number(Boolean(pressed("right"))) - Number(Boolean(pressed("left")));
      const dy = Number(Boolean(pressed("down"))) - Number(Boolean(pressed("up")));
      const seconds = Math.min(delta, 50) / 1000;
      const keyboardDash = this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.space);
      const dashRequested = keyboardDash || touchInput.dashRequested;
      touchInput.dashRequested = false;

      if (time >= this.dashUntil && (dx || dy)) {
        this.facing.set(dx, dy).normalize();
        if (dx) this.player.setFlipX(dx < 0);
      }

      if (dashRequested && time >= this.nextDashAt) {
        this.dashDirection.copy(this.facing);
        this.dashUntil = time + DASH_DURATION;
        this.nextDashAt = this.dashUntil + DASH_COOLDOWN;
      }

      const running = this.cursors?.shift.isDown || touchInput.held.has("run");
      if (time < this.dashUntil) {
        this.movePlayer(
          this.dashDirection.x * DASH_SPEED * seconds,
          this.dashDirection.y * DASH_SPEED * seconds,
        );
        this.player.anims.stop();
        this.player.setFrame(4);
      } else if (dx || dy) {
        const distance = (running ? RUN_SPEED : WALK_SPEED) * seconds;
        this.movePlayer(this.facing.x * distance, this.facing.y * distance);
        this.player.play("scout-player-walk", true);
        this.player.anims.timeScale = running ? RUN_SPEED / WALK_SPEED : 1;
      } else {
        this.player.anims.stop();
        this.player.setFrame(0);
      }

      if (this.leaving) return;

      const encounter = encountersByRoom.get(ROOMS[this.roomIndex].name);
      if (encounter) {
        this.roam(time, seconds);
        const touching = Phaser.Math.Distance.Between(
          this.player.x, this.player.y, this.monster.x, this.monster.y,
        ) <= CONTACT_RADIUS;
        if (touching) {
          this.leaving = true;
          this.player.anims.stop();
          this.monster.anims.stop();
          this.prompt.setText("Entering the hunt…");
          onEncounter(encounter, {
            room: ROOMS[this.roomIndex].name,
            x: this.player.x,
            y: this.player.y,
          });
        }
      }
      this.player.setDepth(this.player.y);
    }

    private movePlayer(dx: number, dy: number) {
      const x = this.player.x + dx;
      const y = this.player.y + dy;
      const nearSideDoor = Math.abs(y - HEIGHT / 2) <= DOOR_HALF_WIDTH;
      const nearEndDoor = Math.abs(x - WIDTH / 2) <= DOOR_HALF_WIDTH;

      if (this.roomIndex === 0 && nearSideDoor && x < EDGE) {
        this.leaving = true;
        this.prompt.setText("Returning home…");
        onReturnHome();
        return;
      }

      if (nearSideDoor && x > WIDTH - EDGE && this.enterRoom("right", EDGE + 8, y)) return;
      if (nearSideDoor && x < EDGE && this.enterRoom("left", WIDTH - EDGE - 8, y)) return;
      if (nearEndDoor && y < TOP_EDGE && this.enterRoom("up", x, HEIGHT - EDGE - 8)) return;
      if (nearEndDoor && y > HEIGHT - EDGE && this.enterRoom("down", x, TOP_EDGE + 8)) return;

      this.player.setPosition(
        Phaser.Math.Clamp(x, EDGE, WIDTH - EDGE),
        Phaser.Math.Clamp(y, TOP_EDGE, HEIGHT - EDGE),
      );
    }

    private neighbor(direction: Direction) {
      const room = ROOMS[this.roomIndex];
      const { dx, dy } = DOORS[direction];
      // Keep the route sequential even when nonconsecutive rooms share an edge.
      return ROOMS.findIndex((candidate, index) =>
        Math.abs(index - this.roomIndex) === 1 &&
        candidate.x === room.x + dx && candidate.y === room.y + dy,
      );
    }

    private enterRoom(direction: Direction, x: number, y: number) {
      const next = this.neighbor(direction);
      if (next < 0) return false;

      this.roomIndex = next;
      this.player.setPosition(x, y);
      this.drawRoom();
      return true;
    }

    private roam(time: number, seconds: number) {
      if (time < this.waitUntil) return;

      const target = ROAM_STEPS[this.roamStep];
      const dx = target.x - this.monster.x;
      const dy = target.y - this.monster.y;
      const remaining = Math.hypot(dx, dy);
      const step = 45 * seconds;

      if (remaining <= step) {
        this.monster.setPosition(target.x, target.y);
        this.monster.anims.stop();
        this.monster.setFrame(0);
        this.roamStep = (this.roamStep + 1) % ROAM_STEPS.length;
        this.waitUntil = time + 900;
      } else {
        this.monster.setPosition(
          this.monster.x + (dx / remaining) * step,
          this.monster.y + (dy / remaining) * step,
        );
        if (dx) this.monster.setFlipX(dx > 0);
        this.monster.play("scout-antelaur-walk", true);
      }
      this.monster.setDepth(this.monster.y);
    }

    private drawRoom() {
      const room = ROOMS[this.roomIndex];
      const hasMonster = encountersByRoom.has(room.name);
      this.field.clear();
      this.field.fillStyle(this.roomIndex % 2 === 0 ? 0x385443 : 0x3d5b45);
      this.field.fillRect(0, 0, WIDTH, HEIGHT);
      this.field.lineStyle(8, 0x202e28);
      this.field.strokeRect(4, 4, WIDTH - 8, HEIGHT - 8);
      this.field.fillStyle(0x9c8a61);
      const gates = DOOR_DIRECTIONS.filter((direction) => this.neighbor(direction) >= 0);
      if (this.roomIndex === 0) gates.push("left");
      for (const gate of gates) {
        if (gate === "left" || gate === "right") {
          this.field.fillRect(
            gate === "left" ? 0 : WIDTH - 32,
            HEIGHT / 2 - DOOR_HALF_WIDTH, 32, DOOR_HALF_WIDTH * 2,
          );
        } else {
          const height = gate === "up" ? TOP_EDGE + 8 : 32;
          this.field.fillRect(
            WIDTH / 2 - DOOR_HALF_WIDTH,
            gate === "up" ? 0 : HEIGHT - height, DOOR_HALF_WIDTH * 2, height,
          );
        }
      }

      this.monster.anims.stop();
      this.monster.setPosition(338, 166).setFrame(0).setFlipX(false).setVisible(hasMonster);
      this.roamStep = 0;
      this.waitUntil = 0;
      this.roomLabel.setText(`${this.roomIndex + 1} / ${ROOMS.length} · ${room.name}`);
      const forward = gates.find((direction) => this.neighbor(direction) > this.roomIndex);
      this.prompt.setText(
        this.roomIndex === 0
          ? "West gate → Home  ·  East gate → Reed Bank"
          : forward
          ? `${DOORS[forward].label} gate → ${ROOMS[this.roomIndex + 1].name}`
          : hasMonster ? "Touch Antelaur to hunt" : "Follow the gate back to explore",
      );
    }
  }

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WIDTH,
    height: HEIGHT,
    scene: ScoutingScene,
    audio: { noAudio: true },
    render: { pixelArt: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
}
