# HunterRoams Game System

This document is the source of truth for the first HunterRoams vertical slice.
It records the intended system boundaries and gameplay rules before implementation.

## Product direction

HunterRoams is a browser-based, mobile-first, dark-fantasy pixel-art monster hunting game.
Players select a broad fictional region, receive a generated Hunting Ground, choose one
available monster encounter, complete the hunt in Phaser, and receive server-validated loot.

The first version does not use GPS or a live weather API.

## MVP gameplay loop

```text
Select region
  -> Generate Hunting Ground
  -> Review available encounters
  -> Select one monster
  -> Start validated hunt session
  -> Fight in Phaser
  -> Submit result
  -> Receive server-validated loot
  -> View inventory and progression
```

## Hunting Ground generation

Players choose a broad game region manually. A region is fictional and must not represent
the player's exact real-world location.

Example regions:

- Northwood
- Mirelow Marsh
- Emberfall Ruins

The server creates a Hunting Ground using a two-hour time slot:

```text
timeSlot = floor(currentUnixTime / 7200)
seed = hash(regionId + calendarDate + timeSlot)
```

The same region and two-hour slot should produce a stable base Hunting Ground. The server
may apply player progression rules after generation so that new players do not receive
encounters they cannot access.

The Hunting Ground should contain:

- `id`
- `regionId`
- `biome`
- `seed`
- `timeSlot`
- `weatherState`
- fictional zones
- available encounters
- `expiresAt`

The two-hour boundary is a generation boundary, not a requirement to interrupt an active
hunt. A hunt already in progress can finish normally.

## Weather and time

Weather is simulated from the Hunting Ground seed. No weather API is required for the MVP.
Possible weather states include:

- Clear
- Rain
- Mist
- Heat
- Storm
- Frost

Time is represented by broad periods rather than exact times in the UI:

- Dawn: 05:00–08:59
- Day: 09:00–16:59
- Dusk: 17:00–19:59
- Night: 20:00–04:59

The server determines the active period. The client displays a readable label such as
`Night` or `Misty conditions`.

## Monster spawning

The server generates a limited encounter table when a Hunting Ground is created. Monsters
are not continuously spawned by the client.

Default MVP encounter count:

- 3 common encounters
- 1 uncommon encounter
- 1 rare encounter when unlocked

Spawn eligibility is based on weighted rules:

```text
biome compatibility
* time-period compatibility
* weather compatibility
* player progression
* deterministic Hunting Ground seed
```

Example rule tendencies:

| Condition | Monster tendency |
| --- | --- |
| Dawn or day | Common predators, herbivores, gathering creatures |
| Dusk or night | Nocturnal beasts and spirits |
| Rain | Water, swamp, amphibious, and lightning monsters |
| Mist | Illusion, spirit, and rare monsters |
| Storm | Lightning and aggressive monsters |

Each encounter belongs to a fictional zone such as `Moonlit Clearing`, `Hollow Creek`,
or `Thorn Ridge`. Zones provide exploration flavor without exposing real coordinates.

## Encounter data

An encounter should provide:

```ts
type Encounter = {
  id: string;
  huntingGroundId: string;
  monsterId: string;
  zoneId: string;
  difficulty: number;
  element: string;
  recommendedEquipmentLevel: number;
  rewardPreview: RewardPreview[];
  distanceLabel: "Nearby" | "A short trek" | "Farther out";
  expiresAt: string;
  status: "available" | "expired" | "completed";
};
```

Encounters remain available until the Hunting Ground expires, are removed after a completed
hunt, and cannot be claimed more than once.

## Hunting Ground display

The Hunting Ground is a stylized fictional map, not a real geographic map.

The React interface displays:

- Hunting Ground name
- Biome illustration
- Time period
- Simulated weather
- Encounter markers assigned to fictional zones
- Encounter cards
- Expiration countdown
- Player level and shortcuts to inventory and quests

Encounter cards are the primary mobile interaction. Clicking a card or its marker opens the
same encounter detail panel:

- Pixel-art monster preview
- Monster name
- Difficulty
- Element or attack type
- Recommended equipment level
- Possible rewards
- Approximate distance label
- Remaining availability
- Hunt button

## React and Phaser responsibilities

React owns:

- Application shell and routing
- Authentication
- Region selection
- Hunting Ground and encounter UI
- Inventory, crafting, quests, and player profile
- Loading, errors, and combat result screens
- API communication

Phaser owns:

- Player movement
- Monster movement and AI
- Attacks, dodging, stamina, and hit detection
- Health bars and combat animation
- Combat effects
- In-scene victory or defeat state

React and Phaser communicate through explicit typed state and events. Phaser must not own
inventory, rewards, authentication, or other persistent game data.

## Charged attacks

Phaser chooses the move and locks its facing when the attack key is pressed.
Holding the key shows that move's charge pose. Releasing it executes the chosen move
with the accumulated charge time. Changing directional input mid-charge does not
change the move or its facing.

| Direction held when charging starts | Move | Charge pose | Motion on release |
| --- | --- | --- | --- |
| Neither Left nor Right | Overhead slash | Blade raised behind the head | Rotate the blade overhead toward the locked facing |
| Left or Right | Forward thrust | Blade horizontal at waist height, pulled back toward the body | Extend the blade straight toward the held direction |
| Both Left and Right | Forward thrust to the left | Same thrust pose, facing left | Extend the blade to the left |

When neither arrow is held, use the player's last facing direction. Left takes
priority when both are held, matching the current movement input. The weapon pivot
follows the player during charging and attacking. Sheathing cannot overwrite an
active charge pose. Each attack can damage a monster once during its active motion.

## Combat validation and rewards

Before combat starts, the server verifies:

- The encounter exists
- The encounter belongs to the player's current Hunting Ground
- The encounter has not expired
- The player meets progression requirements
- The player does not already have an active duplicate hunt

The server creates a short-lived hunt session. After combat, the client submits the result
to the server. The server validates the session, determines the reward, records the hunt,
and updates inventory in one protected transaction.

The client must never determine final rewards, item quantities, or progression by itself.
Repeated reward claims must be prevented with hunt-session status, database constraints,
and rate limits.

## Inventory and progression

The first progression system includes:

- Player level and experience
- Materials from completed hunts
- Inventory quantities
- Three craftable weapons
- Equipment level
- Simple quests

Crafting is server-validated against the player's current inventory and recipe requirements.

## Home system

The Home is the player's personal management hub. It replaces the need for NPCs to be
distributed around the Hunting Ground while still giving the game a sense of community.

The Home provides:

- Storage
- Cooking
- Workshop services
- Mailbox
- Residents
- Bedroom upgrades
- Quest and progression access

The Home is presented as a responsive React interface. It does not need to be a Phaser
scene for the MVP.

### Storage

Storage holds:

- Monster materials
- Food ingredients
- Crafted items
- Weapons and armor
- Potions and consumables
- Quest items

Storage categories may have separate capacity limits. All item quantities and capacity
changes are server-owned and validated.

### Cooking

Cooking converts ingredients into temporary consumables used before or during hunts.
Example recipes include:

| Recipe | Ingredients | Effect |
| --- | --- | --- |
| Mossroot Stew | Mossroot + Meat | Restores health |
| Ember Broth | Ember Shard + Meat | Provides fire resistance |
| Nightleaf Tea | Nightleaf + Water | Improves stamina |
| Marsh Cake | Marsh Fruit + Grain | Improves dodge stamina |

The MVP should use instant cooking with a small recipe set. The server validates recipe
requirements and consumes the ingredients.

### Mailbox services

The player sends requests to stores and workshops through the Home mailbox rather than
walking to physical NPCs in the world.

Supported service types may include:

- General Store: buy supplies and sell common materials
- Blacksmith: craft and upgrade weapons
- Provisioner: buy ingredients and manage cooking recipes
- Guild Office: receive contracts and claim quest rewards

Store actions should be immediate in the MVP. The mailbox provides the communication and
delivery presentation without making the player wait for a timer. Delivery delays and
special merchant events can be added later.

Example mailbox actions:

```text
Buy item
Craft item
Sell materials
Upgrade equipment
Claim delivery
```

Mailbox messages may contain service confirmations, item attachments, quest information,
and short resident dialogue. Purchases, crafting, selling, and upgrades are all validated
by the server.

### Home residents and bedrooms

The Home supports up to five residents. Residents are unlocked by repairing or unlocking
bedrooms. They provide services and personality through Home interactions and mailbox
messages; they do not need to appear as roaming NPCs in the Hunting Ground.

Default resident progression:

| Resident | Unlock | Main role |
| --- | --- | --- |
| Caretaker | Available at the start | Tutorial, storage, beginner guidance |
| Blacksmith | Bedroom 2 | Craft and upgrade equipment |
| Cook | Bedroom 3 | Cook food and unlock recipes |
| Merchant | Bedroom 4 | Buy, sell, and rotate supplies |
| Researcher or Guild Scout | Bedroom 5 | Monster knowledge, contracts, unlocks |

Bedrooms can require coins, materials, player levels, and completed quests. Example
requirements are intentionally configurable so progression can be tuned without changing
the UI architecture.

Residents may have service levels that unlock additional recipes, equipment, discounts,
rare requests, or special quests. Resident progression should remain separate from combat
progression and should not be required for the first complete hunt.

The Home loop is:

```text
Complete hunt
  -> Receive materials
  -> Return Home
  -> Store materials or cook food
  -> Mail a craft or upgrade request
  -> Receive service confirmation
  -> Prepare for the next hunt
```

## Privacy and security rules

- Do not request GPS for the MVP.
- Do not store or display exact player coordinates.
- Use fictional regions and zones.
- Treat all client data as untrusted.
- Keep rewards and progression server-authoritative.
- Add rate limits to encounter generation, hunt completion, and reward claims.
- Do not use background location tracking.
- Keep secrets and API keys on the server only.

## Optional NPC dialogue with Gemini

Gemini can be added later for flavor dialogue, NPC personality, hints, and short reactions.
It must not control combat, rewards, quests, item quantities, or other authoritative rules.

Recommended design:

```text
Player opens NPC dialogue
  -> Server builds a small context from safe game state
  -> Server calls Gemini
  -> Server validates and limits the response
  -> Client displays dialogue
```

Requirements:

- Store the Gemini API key only in server environment variables.
- Use strict token and request limits.
- Add canned fallback dialogue when Gemini is unavailable.
- Avoid sending personal data or exact location information.
- Treat generated text as untrusted presentation content.
- Cache common dialogue where practical.

Gemini is an optional enhancement and should not block the vertical slice.

## MVP completion definition

The first vertical slice is complete when a player can:

1. Select a region manually.
2. Receive a Hunting Ground generated for the current two-hour slot.
3. View encounter cards and fictional map markers.
4. Select one available monster.
5. Start a validated Phaser combat session.
6. Move, attack, dodge, manage stamina, and defeat the monster.
7. Receive server-validated loot.
8. View the loot in inventory.
9. Return to the Hunting Ground after the hunt.

Future features such as GPS, real weather, multiplayer, and AI-generated NPC dialogue can
be added without changing this core architecture.
