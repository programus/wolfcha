# Werewolf (狼人杀) — Player's Guide

> This guide is written for first-time players or anyone unfamiliar with the rules. It also serves as a reference document for future development.

---

## Table of Contents

1. [What Is Werewolf?](#1-what-is-werewolf)
2. [Teams and Win Conditions](#2-teams-and-win-conditions)
3. [Standard Game Setup (10 Players)](#3-standard-game-setup-10-players)
4. [Role Reference](#4-role-reference)
5. [Game Flow](#5-game-flow)
6. [The Sheriff System](#6-the-sheriff-system)
7. [Voting Rules](#7-voting-rules)
8. [Quick Rule Reference](#8-quick-rule-reference)
9. [Glossary of Common Terms](#9-glossary-of-common-terms)

---

## 1. What Is Werewolf?

Werewolf (狼人杀) is a hidden-role social deduction game. Players are secretly divided into two sides — the **Good team** and the **Wolf team** — and take turns talking, reasoning, deceiving, and persuading until one side wins.

- **Wolves** know who their teammates are; good players don't know who is a wolf.
- Some good players have **special abilities** (called *key roles* or *神职*) that help find the wolves.
- **Speeches** are the most important source of information — every word can reveal a stance or hint at a secret.

---

## 2. Teams and Win Conditions

| Team | Win Condition |
|------|---------------|
| **Good team** | Eliminate all werewolves (including the White Wolf King) by voting |
| **Wolf team** | Win when the number of living wolves ≥ the number of living good players |

---

## 3. Standard Game Setup (10 Players)

| Team | Role | Count |
|------|------|-------|
| Wolf | Werewolf | 2 |
| Wolf | White Wolf King | 1 |
| Good | Seer | 1 |
| Good | Witch | 1 |
| Good | Hunter | 1 |
| Good | Guard | 1 |
| Good | Villager | 3 |

---

## 4. Role Reference

### 🐺 Werewolf (Wolf team)

- Knows all fellow wolves at the start.
- Each night, coordinates with teammates to choose one player to **kill**.
- During the day, must **pretend to be a good player** and steer discussion toward voting out innocent players.

---

### 👑 White Wolf King (Wolf team)

- Behaves exactly like a Werewolf — same night kill, same daytime disguise.
- **Extra ability (once per game): Daytime Self-Destruct**
  - During the day discussion phase, the White Wolf King can announce a self-destruct.
  - They choose one living player to take down with them — that player **gets no last words**.
  - After self-destructing, the day's vote is **skipped entirely** and the game moves straight to the next night.
- The Seer checks a White Wolf King as **Werewolf** (not a unique result).

> **vs. regular Werewolf**: A normal Werewolf can only act at night; the White Wolf King can strike during the day, eliminating a key target and throwing the good team into chaos.

---

### 🔮 Seer (Good team)

- Each night, secretly **checks one player** to find out if they are a werewolf or a good player.
- Only the Seer learns the result.
- The Seer must decide when (and whether) to publicly reveal their identity to lead the good team.
- A prime target for wolves — wolves will usually try to kill the Seer as early as possible.

---

### 🧪 Witch (Good team)

- Has exactly **one antidote** (saves someone) and **one poison** (kills someone) — one of each for the whole game.
- Can only use **one potion per night**.
- Once a potion is used, it is gone forever.
- **Antidote**: saves the player targeted by wolves tonight (can also be used to self-save).
- **Poison**: kills any living player tonight (including good players — use carefully).
- Each night the Witch sees **who the wolves targeted** before deciding.
- Which potions the Witch currently holds is **private information** — other players must infer from events.

> **Warning (Milk Poison / 毒奶)**: If the Guard and the Witch both try to save the same person on the same night, that player **still dies**.

---

### 🔫 Hunter (Good team)

- When the Hunter dies (whether killed by wolves or voted out), they may immediately **shoot one living player** (once per game).
- **Exception**: if killed by the Witch's poison, the Hunter **cannot shoot**.
- The shot takes effect right after the Hunter's death — choose the target wisely.

---

### 🛡️ Guard (Good team)

- Each night can **protect one living player** from being killed by wolves.
- **Restriction**: cannot protect the same player two nights in a row.
- Can protect themselves.
- **Milk Poison**: if the Guard protects someone on the same night the Witch uses the antidote on that same person, they **still die** (see Witch above).

---

### 🃏 Idiot (Good team)

- The first time they are voted out: **flips their role card and survives** — they are not eliminated.
- After the flip they **permanently lose their voting right**, but can still speak every round.
- **Exception**: killed by wolves at night or poisoned by the Witch = normal death; the flip ability does not apply.

> **Tip**: The Idiot can speak boldly during the day without fear of being mistakenly voted out — a great role for confident speakers.

---

### 🧑‍🌾 Villager (Good team)

- No special ability whatsoever.
- Wins by listening carefully, reasoning from speeches, and voting correctly.
- Do not underestimate Villagers — independent analysis from a sharp Villager can be decisive in close games.

---

## 5. Game Flow

Each round consists of one **Night** followed by one **Day**, repeating until a team wins.

### Round 1 (Special Order)

```
Night actions → Sheriff campaign → Deaths announced → Day discussion → Vote
```

### Round 2 Onward (Standard Order)

```
Night actions → Deaths announced → Day discussion → Vote
```

---

### 🌙 Night Phase

All players close their eyes. Roles act in sequence — secretly, one at a time:

1. **Guard** — chooses one player to protect.
2. **Wolves** — discuss among themselves and choose one player to kill.
3. **Witch** — learns who the wolves targeted; decides whether to use the antidote (save) or poison (kill someone else), or pass.
4. **Seer** — chooses one player to check (learns: werewolf or good).

> All night actions are hidden from other players. Only public announcements (deaths) are visible.
>
> **Important**: Night actions happen in sequence and all deaths are officially announced **at dawn**. This means a role targeted by wolves **can still use their ability on the same night they are killed**. For example: a Seer who is the knife target can still perform their nightly check; a Witch who is the target can see herself as the knife target and choose to self-save with the antidote.

---

### ☀️ Day Phase

**Death Announcement**: The game announces who died last night (names are revealed; cause of death is simply stated as "night death" — specific killers are not named).
- If nobody died, it's called a **Peaceful Night** — possible reasons: Witch saved someone, Guard blocked the kill, or wolves chose not to attack.

**Last Words**: Eliminated players (from the previous night or current round) may give a brief final speech.

**Special Events on Death**:
- **Hunter dies** → immediately announces a shot and takes one player with them (unless poisoned).
- **White Wolf King is voted out** → the actual self-destruct ability is triggered **during day discussions** (not on death by vote — the WWK must announce it themselves before the vote).

**Discussion**: All living players speak in turn (one speech per player per day) — sharing observations, suspicions, and reasoning.

---

## 6. The Sheriff System

**On Day 1 only**, before deaths are announced, the game holds a **Sheriff (警长) Campaign**:

1. **Sign-up**: Any player who wants to run raises their hand.
2. **Campaign speeches**: Each candidate gives a speech. Players who didn't sign up do not speak in this phase.
3. **Vote**: **Non-candidates (警下玩家)** vote for one of the candidates; candidates themselves do not vote. The candidate with the most votes becomes Sheriff.
   - If tied: PK speeches, then revote. If tied again: the badge is **torn** (no Sheriff this game).

**Sheriff privileges**:
- Votes count as **1.5** (one Sheriff vote = 1.5 normal votes).
- On death, the Sheriff may **pass the badge** to any living player, or **tear it** to deny anyone the advantage.

> The direction of a badge pass is itself information — experienced players read badge transfers as hints about the outgoing Sheriff's reads.

---

## 7. Voting Rules

- All living players vote simultaneously, each choosing one player to eliminate.
- The player with **the most votes** is exiled.
- **Tie**: the tied players give PK speeches, then a revote happens. Repeats once more if still tied. If after 3 total rounds there's still a tie, **no one is eliminated** this round.
- The eliminated player gives **last words**, then the Hunter can shoot (if applicable).
- **Idiot flip**: if the eliminated player is an Idiot who hasn't flipped yet, they survive, reveal their card, and lose their voting rights going forward.

---

## 8. Quick Rule Reference

| Rule | Summary |
|------|---------|
| **Milk Poison** | Guard protects + Witch heals the **same person** on the same night → they still die |
| **Hunter can't shoot if poisoned** | Witch poison → Hunter cannot fire the revenge shot on death |
| **Idiot flip** | Immune to the *first* vote-out; loses vote rights, but can still speak; dies normally thereafter |
| **WWK self-destruct** | Announced during discussion; target has no last words; day vote is skipped |
| **Peaceful night** | No one died overnight; wolf self-kill (targeting their own teammate) does cause a death and is NOT peaceful |
| **Badge torn** | Sheriff tears badge or campaign ends in permanent tie → no Sheriff, no 1.5× vote bonus this game |
| **Speaking order** | Starts from a designated seat, typically clockwise; Sheriff speaks last (or announces the order) |

---

## 9. Glossary of Common Terms

### Basic Actions

| Term | Meaning |
|------|---------|
| **Knife / 刀** | Wolves choosing and killing a target at night; the chosen victim is the "knife target" (刀口) |
| **Empty knife / 空刀** | Wolves deliberately skip their kill — no one is killed by wolves that night |
| **Self-knife / 自刀** | Wolves choose to kill one of their own teammates to create confusion |
| **Check / 验人** | The Seer investigating one player's identity at night |
| **Claim / Jump / 跳** | Publicly revealing your role; "claim Seer" (跳预言家) means announcing you are the Seer |
| **Shoot / 开枪** | The Hunter firing their revenge shot on death |
| **Flip / 翻牌** | The Idiot revealing their role card to survive the first vote-out |
| **Self-destruct / 自爆** | The White Wolf King announcing their daytime explosion |

### Roles and Teams

| Term | Meaning |
|------|---------|
| **Key role / 神职** | Collective term for good-team roles with special abilities: Seer, Witch, Hunter, Guard, Idiot |
| **Hard claim / 悍跳** | Boldly claiming a key role (usually a wolf faking the Seer); the wolf doing this is a "hard-claimer" (悍跳狼) |
| **True Seer / 真预** | The genuine Seer, as opposed to a wolf fake-claiming the role |
| **Fake Seer / 假预** | A player (usually a wolf) falsely claiming to be the Seer |
| **Wolf pit / 狼坑** | A seat that most players have identified or strongly suspect is a werewolf; "Seat X is a wolf pit" means X is very likely a wolf |

### Check Results

| Term | Meaning |
|------|---------|
| **Gold water / 金水** | A player the Seer has publicly confirmed as good; "I gold-watered Seat X" means X is a good player |
| **Kill check / 查杀** | A player the Seer has confirmed as a werewolf; "kill-check on Seat X" means X is a wolf |
| **Silver water / 银水** | A player indirectly trusted as good — not verified directly by the Seer but vouched secondhand; usage varies |

### Speeches and Reasoning

| Term | Meaning |
|------|---------|
| **Set the pace / 带节奏** | Leading the discussion and steering others' votes toward your preferred target |
| **Shift blame / 甩锅** | Redirecting suspicion onto another player to take heat off yourself or a teammate |
| **Side with / 站边** | Openly supporting a player ("I side with Seat X"); flipping later is called 反水 (turning coat) |
| **Go quiet / 潜水** | Speaking minimally, not committing to a position, watching events unfold |
| **Charge / 冲锋** | Aggressively and publicly accusing someone of being a wolf, accepting the risk of being targeted |
| **Bait and switch / 倒钩** | Hiding your true read early, then dramatically flipping at a key moment |
| **Logic pressure / 逻辑压人** | Using tight logical arguments to force someone to justify their position |
| **Wolf's-eye view / 狼视角** | When a player's reasoning inadvertently reveals knowledge only a wolf would have — a tell |
| **Counter-claim / 对跳** | Two players both claiming the same role (usually Seer), forcing others to judge which is real |

### Voting and the Badge

| Term | Meaning |
|------|---------|
| **Run for Sheriff / 上警** | Signing up as a candidate during the Sheriff campaign |
| **Candidate / 警上** | A player who has entered the Sheriff campaign; candidates do not vote in the election |
| **Non-candidate / 警下** | A player who did not enter the campaign; only non-candidates vote in the election |
| **Consolidate votes / 归票** | Directing votes onto one target to ensure elimination; "Sheriff calls votes on Seat X" |
| **Badge flow / 警徽流** | The strategic signal in who the Sheriff passes the badge to on death |
| **Tie / PK** | A tied vote triggers PK speeches and a revote |
| **Tear the badge / 撕警徽** | Sheriff destroys the badge on death so no one inherits the 1.5× vote bonus |

### Status and Outcomes

| Term | Meaning |
|------|---------|
| **Peaceful night / 平安夜** | A night where no one dies: Witch save, Guard block, or wolves empty-knife |
| **Milk poison / 毒奶** | Guard and Witch both protect the same person on the same night — that person still dies |
| **Eliminated / 出局** | A player voted out or killed at night, removed from the game |
| **Last words / 遗言** | The brief final speech a player gives immediately after being eliminated |
| **Comeback / 翻盘** | The losing team reverses the situation and wins |
