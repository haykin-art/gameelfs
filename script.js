document.addEventListener("DOMContentLoaded", () => {

    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 1200;
    canvas.height = 630;

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    const hpBar = document.getElementById("hpBar");
    const mpBar = document.getElementById("mpBar");

    const hpDisplay = document.getElementById("hpDisplay");
    const mpDisplay = document.getElementById("mpDisplay");

    const scoreDisplay = document.getElementById("scoreDisplay");
    const timerDisplay = document.getElementById("timerDisplay");

    const startScreen = document.getElementById("startScreen");
    const gameScreen = document.getElementById("gameScreen");
    const endScreen = document.getElementById("endScreen");

    const pauseScreen = document.getElementById("pauseScreen");

    const startBtn = document.getElementById("startBtn");
    const restartBtn = document.getElementById("restartBtn");
    const exitBtn = document.getElementById("exitBtn");

    const playerName = document.getElementById("playerName");

    // Текстуры и анимации
    const textures = {
        backgrounds: { forest: null, dark: null, snow: null, lava: null },
        characters: {
            player: { idle: [], walk: [], attack: [] },
            goblin: { walk: [], attack: [] },
            orc: { walk: [], attack: [] },
            troll: { walk: [], attack: [] },
            berserker: { walk: [], attack: [] },
            shaman: { walk: [], attack: [] },
            king: { walk: [], attack: [] }
        },
        objects: { arrow: null, hp: null, mp: null, speed: null, damage: null }
    };

    // Количество кадров для каждого персонажа
    const animationConfig = {
        player: { idle: 20, walk: 20, attack: 20 },
        goblin: { walk: 24, attack: 12 },
        orc: { walk: 24, attack: 12 },
        troll: { walk: 24, attack: 12 },
        berserker: { walk: 18, attack: 12 },
        shaman: { walk: 20, attack: 20 },
        king: { walk: 24, attack: 12 }
    };

    let texturesLoaded = 0;
    let totalTextures = 4;

    for (const char in animationConfig) {
        const anims = animationConfig[char];
        for (const anim in anims) totalTextures += anims[anim];
    }
    totalTextures += 5;

    function checkAllLoaded() {
        texturesLoaded++;
        if (texturesLoaded >= totalTextures) console.log("✅ Все текстуры загружены!");
    }

    function loadTexture(path, callback) {
        const img = new Image();
        img.onload = () => { checkAllLoaded(); if (callback) callback(img); };
        img.onerror = () => { console.warn("⚠️ Не удалось загрузить:", path); checkAllLoaded(); };
        img.src = path;
        return img;
    }

    // Загрузка фонов
    textures.backgrounds.forest = loadTexture("assets/backgrounds/forest.png");
    textures.backgrounds.dark = loadTexture("assets/backgrounds/dark.png");
    textures.backgrounds.snow = loadTexture("assets/backgrounds/snow.png");
    textures.backgrounds.lava = loadTexture("assets/backgrounds/lava.png");

    function loadCharacterAnimations(charName, config) {
        const charData = textures.characters[charName];
        const basePath = `assets/characters/${charName}/`;

        for (const animName in config) {
            const frameCount = config[animName];
            charData[animName] = [];

            let prefix = "";
            if (charName === "player") {
                if (animName === "idle") prefix = "3_animation_idle_";
                else if (animName === "walk") prefix = "3_animation_walk_";
                else if (animName === "attack") prefix = "3_animation_attack_";
            } else if (charName === "berserker") {
                if (animName === "walk") prefix = "Minotaur_03_Walking_";
                else if (animName === "attack") prefix = "Minotaur_03_Attacking_";
            } else if (charName === "goblin") {
                if (animName === "walk") prefix = "0_Goblin_Walking_";
                else if (animName === "attack") prefix = "0_Goblin_Slashing_";
            } else if (charName === "king") {
                if (animName === "walk") prefix = "0_Golem_Walking_";
                else if (animName === "attack") prefix = "0_Golem_Slashing_";
            } else if (charName === "orc") {
                if (animName === "walk") prefix = "0_Orc_Walking_";
                else if (animName === "attack") prefix = "0_Orc_Slashing_";
            } else if (charName === "shaman") {
                if (animName === "walk") prefix = "6_animation_walk_";
                else if (animName === "attack") prefix = "6_animation_attack_";
            } else if (charName === "troll") {
                if (animName === "walk") prefix = "0_Ogre_Walking_";
                else if (animName === "attack") prefix = "0_Ogre_Slashing_";
            }

            for (let i = 0; i < frameCount; i++) {
                const num = String(i).padStart(3, "0");
                charData[animName].push(loadTexture(`${basePath}${prefix}${num}.png`));
            }
        }
    }

    for (const charName in animationConfig) {
        loadCharacterAnimations(charName, animationConfig[charName]);
    }

    // Объекты (стрелы, зелья)
    textures.objects.arrow = loadTexture("assets/objects/arrow.png");
    textures.objects.hp = loadTexture("assets/objects/hp_potion.png");
    textures.objects.mp = loadTexture("assets/objects/mp_potion.png");
    textures.objects.speed = loadTexture("assets/objects/speed_potion.png");
    textures.objects.damage = loadTexture("assets/objects/damage_potion.png");

    // Состояние игры
    let gameRunning = false;
    let paused = false;
    let score = 0;
    let gameSeconds = 0;
    const keys = {};

    const world = {
        width: 1200,
        height: HEIGHT,
        ground: HEIGHT - 90,
        cameraX: 0
    };

    // Система уровней
    let currentLevel = 0;
    let currentWave = 0;
    let enemiesKilled = 0;
    let enemiesSpawned = 0;
    let levelChanging = false;
    let levelTitleTimer = 0;

    const levels = [{
        id: 1,
        name: "Лес Эльфов",
        description: "Древний лес, населённый гоблинами.",
        background: "forest",
        needKills: 20,
        waves: [
            { amount: 8, enemies: ["goblin"] },
            { amount: 10, enemies: ["goblin", "goblin", "orc"] },
            { amount: 12, enemies: ["goblin", "orc"] }
        ]
    }, {
        id: 2,
        name: "Преддверие Тьмы",
        description: "Здесь кончается свободный мир.",
        background: "dark",
        needKills: 35,
        waves: [
            { amount: 12, enemies: ["orc"] },
            { amount: 14, enemies: ["goblin", "orc"] },
            { amount: 16, enemies: ["orc", "troll"] }
        ]
    }, {
        id: 3,
        name: "Жилы Цитадели",
        description: "Здесь гаснет последняя надежда.",
        background: "snow",
        needKills: 50,
        waves: [
            { amount: 15, enemies: ["orc", "troll"] },
            { amount: 18, enemies: ["troll"] },
            { amount: 20, enemies: ["orc", "troll"] }
        ]
    }, {
        id: 4,
        name: "Черное Сердце Орды",
        description: "Здесь либо смерть, либо корона.",
        background: "lava",
        needKills: 70,
        waves: [
            { amount: 20, enemies: ["orc", "troll"] },
            { amount: 24, enemies: ["troll"] },
            { amount: 28, enemies: ["orc", "orc", "troll"] }
        ]
    }];

    function getLevel() { return levels[currentLevel]; }
    function getWave() { return getLevel().waves[currentWave]; }

    function startLevel(index) {
        currentLevel = index;
        currentWave = 0;
        enemiesKilled = 0;
        enemiesSpawned = 0;
        levelChanging = true;
        levelTitleTimer = 240;
    }

    function nextWave() {
        const lastWave = currentWave >= getLevel().waves.length - 1;
        if (lastWave) {
            if (!boss) {
                if (currentLevel === 0) { spawnBoss("berserker"); return; }
                if (currentLevel === 1) { spawnBoss("shaman"); return; }
                nextLevel();
                return;
            }
        }
        currentWave++;
        enemiesSpawned = 0;
    }

    function nextLevel() {
        if (currentLevel === levels.length - 1) {
            if (!boss) spawnFinalBoss();
            return;
        }
        currentLevel++;
        currentWave = 0;
        enemiesKilled = 0;
        enemiesSpawned = 0;
        levelChanging = true;
        levelTitleTimer = 240;
    }

    // Игрок
    const player = {
        x: 180,
        y: world.ground - 30,
        width: 200,
        height: 200,
        speed: 5,
        direction: 1,
        hp: 100,
        maxHp: 300,
        mp: 100,
        maxMp: 600,
        shield: false,
        invincible: false,
        attackCooldown: 0,
        state: "idle",
        animFrame: 0,
        animTimer: 0,
        animSpeed: 6
    };

    // Массивы объектов
    const enemies = [];
    const arrows = [];
    const rainArrows = [];
    const fireballs = [];
    const particles = [];
    const drops = [];

    // Баффы
    const buffs = {
        damage: 0,
        speed: 0,
        rapid: 0
    };

    // RPG система
    let playerLevel = 1;
    let experience = 0;
    let nextLevelXP = 100;
    let skillPoints = 0;
    let levelUpAnimation = 0;

    const upgrades = [{
        name: "+20 HP",
        apply() {
            player.maxHp += 20;
            player.hp = player.maxHp;
        }
    }, {
        name: "+20 MP",
        apply() {
            player.maxMp += 20;
            player.mp = player.maxMp;
        }
    }, {
        name: "+10% Урон",
        apply() {
            arrows.forEach(a => a.damage *= 1.1);
        }
    }, {
        name: "+Скорость",
        apply() {
            player.speed += 0.5;
        }
    }, {
        name: "Быстрая перезарядка",
        apply() {
            for (const key in cooldowns) {
                cooldowns[key] = Math.max(cooldowns[key] - 30, 0);
            }
        }
    }];

    // Перезарядка умений
    const cooldowns = {
        shot: 0,
        shield: 0,
        triple: 0,
        rain: 0
    };

    // Типы врагов
    const enemyTypes = {
        goblin: {
            hp: 25,
            speed: 2.4,
            damage: 4,
            width: 200,
            height: 200,
            score: 1
        },
        orc: {
            hp: 55,
            speed: 1.8,
            damage: 7,
            width: 200,
            height: 200,
            score: 1
        },
        troll: {
            hp: 100,
            speed: 1,
            damage: 12,
            width: 200,
            height: 200,
            score: 1
        },
        berserker: {
            hp: 350,
            speed: 1.5,
            damage: 18,
            width: 250,
            height: 250,
            score: 20
        },
        shaman: {
            hp: 280,
            speed: 1.2,
            damage: 14,
            width: 250,
            height: 250,
            score: 20
        }
    };

    let boss = null;

    // UI
    function updateUI() {
        hpBar.style.width = (player.hp / player.maxHp * 100) + "%";
        mpBar.style.width = (player.mp / player.maxMp * 100) + "%";
        hpDisplay.textContent = Math.round(player.hp);
        mpDisplay.textContent = Math.round(player.mp);
        scoreDisplay.textContent = score;
    }

    // Опыт
    function addExperience(amount) {
        experience += amount;
        while (experience >= nextLevelXP) {
            experience -= nextLevelXP;
            playerLevel++;
            skillPoints++;
            nextLevelXP = Math.floor(nextLevelXP * 1.35);
            levelUpAnimation = 180;
        }
    }

    // HUD
    function drawHUD() {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,.45)";
        ctx.fillRect(15, 15, 270, 95);
        ctx.fillStyle = "#fff";
        ctx.font = "20px Segoe UI";
        ctx.fillText("Уровень: " + (currentLevel + 1), 30, 45);
        ctx.fillText(getLevel().name, 30, 72);
        ctx.fillStyle = "#ffd54f";
        ctx.fillText("Волна: " + (currentWave + 1) + " / " + getLevel().waves.length, 30, 98);
        ctx.restore();
    }

    function drawXP() {
        const w = 260, h = 16, x = 15, y = 120;
        ctx.fillStyle = "rgba(0,0,0,.45)";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#3fa9ff";
        ctx.fillRect(x, y, w * (experience / nextLevelXP), h);
        ctx.strokeStyle = "white";
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = "white";
        ctx.font = "16px Segoe UI";
        ctx.fillText("Уровень героя " + playerLevel, x, y - 8);
    }

    function drawLevelUp() {
        if (levelUpAnimation <= 0) return;
        levelUpAnimation--;
        ctx.save();
        ctx.globalAlpha = Math.min(levelUpAnimation / 60, 1);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffd54f";
        ctx.font = "bold 58px Segoe UI";
        ctx.fillText("LEVEL UP!", WIDTH / 2, 130);
        ctx.font = "28px Segoe UI";
        ctx.fillStyle = "white";
        ctx.fillText("Уровень " + playerLevel, WIDTH / 2, 175);
        ctx.restore();
    }

    // Фон
    function drawBackground() {
        const bgName = getLevel().background;
        const bg = textures.backgrounds[bgName];
        if (bg && bg.complete && bg.naturalWidth > 0) {
            const offset = -world.cameraX * 0.3;
            ctx.drawImage(bg, offset, 0, WIDTH, HEIGHT);
        } else {
            let colors = {
                forest: ["#7CCEFF", "#61C45E"],
                dark: ["#42506b", "#2c5530"],
                snow: ["#dfefff", "#c9d7ea"],
                lava: ["#6b1d14", "#b94425"]
            };
            const c = colors[bgName] || colors.forest;
            const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
            grad.addColorStop(0, c[0]);
            grad.addColorStop(1, c[1]);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            drawGround();
        }
    }

    function drawGround() {
        ctx.fillStyle = "#3C7E2E";
        ctx.fillRect(0, world.ground, WIDTH, HEIGHT - world.ground);
        ctx.fillStyle = "#5BAF42";
        for (let i = 0; i < WIDTH; i += 18) {
            ctx.fillRect(i, world.ground + Math.sin((i + world.cameraX) / 18) * 2, 10, 4);
        }
    }

    // Заголовок уровня
    function drawLevelTitle() {
        if (!levelChanging) return;
        ctx.save();
        ctx.globalAlpha = Math.min(levelTitleTimer / 60, 1);
        ctx.fillStyle = "rgba(0,0,0,.45)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffd54f";
        ctx.font = "bold 54px Segoe UI";
        ctx.fillText("Глава " + (currentLevel + 1), WIDTH / 2, HEIGHT / 2 - 40);
        ctx.font = "34px Segoe UI";
        ctx.fillStyle = "white";
        ctx.fillText(getLevel().name, WIDTH / 2, HEIGHT / 2 + 15);
        ctx.font = "22px Segoe UI";
        ctx.fillStyle = "#d8d8d8";
        ctx.fillText(getLevel().description, WIDTH / 2, HEIGHT / 2 + 55);
        ctx.restore();
    }

    // Отрисовка персонажа с анимацией
    function drawAnimatedCharacter(x, y, width, height, direction, charName, animName, frameIndex) {
        const animFrames = textures.characters[charName]?.[animName];
        if (!animFrames || animFrames.length === 0) {
            ctx.fillStyle = "#ff00ff";
            ctx.fillRect(x - width / 2, y - height, width, height);
            return;
        }
        const img = animFrames[Math.floor(frameIndex) % animFrames.length];
        if (!img || !img.complete) return;
        ctx.save();
        ctx.translate(x, y);
        // для этих персонажей спрайты смотрят в другую сторону
        if (charName === "player" || charName === "shaman") direction *= -1;
        if (direction === -1) ctx.scale(-1, 1);
        ctx.drawImage(img, -width / 2, -height, width, height);
        ctx.restore();
    }

    // Игрок
    function updatePlayer() {
        if (keys["ArrowLeft"]) {
            player.direction = -1;
            player.x -= player.speed;
            player.state = "walk";
        } else if (keys["ArrowRight"]) {
            player.direction = 1;
            player.x += player.speed;
            player.state = "walk";
        } else {
            if (player.state !== "attack") player.state = "idle";
        }

        if (player.attackTimer > 0) {
            player.attackTimer--;
            if (player.attackTimer === 0 && player.state === "attack") {
                player.state = "idle";
                player.animFrame = 0;
            }
        }

        if (player.state === "idle") player.animFrame += 0.3;
        else if (player.state === "walk") player.animFrame += 0.6;
        else if (player.state === "attack") player.animFrame += 0.8;

        player.x = Math.max(player.width / 2, Math.min(world.width - player.width / 2, player.x));
        world.cameraX = player.x - WIDTH / 2;
        world.cameraX = Math.max(0, Math.min(world.cameraX, world.width - WIDTH));

        player.hp = Math.min(player.maxHp, player.hp + 0.015);
        player.mp = Math.min(player.maxMp, player.mp + 0.03);
        if (player.attackCooldown > 0) player.attackCooldown--;
    }

    function drawPlayer() {
        const x = player.x - world.cameraX;
        if (player.state === "attack") {
            drawAnimatedCharacter(x, player.y, player.width, player.height, player.direction, "player", "attack", player.animFrame);
        } else if (player.state === "walk") {
            drawAnimatedCharacter(x, player.y, player.width, player.height, player.direction, "player", "walk", player.animFrame);
        } else {
            drawAnimatedCharacter(x, player.y, player.width, player.height, player.direction, "player", "idle", player.animFrame);
        }
        // Щит
        if (player.shield) {
            ctx.save();
            ctx.translate(x + 30, player.y - player.height / 2 + 5);
            ctx.scale(1.15, 1.45);
            ctx.beginPath();
            ctx.arc(0, 0, 42, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(80,180,255,0.20)";
            ctx.fill();
            ctx.strokeStyle = "#7ad7ff";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        }
    }

    // Создание врагов
    function spawnEnemy(typeName) {
        const type = enemyTypes[typeName];
        const side = Math.random() < 0.5 ? -1 : 1;
        let spawnX = side === 1 ? player.x + WIDTH + Math.random() * 500 : player.x - WIDTH - Math.random() * 500;
        spawnX = Math.max(0, Math.min(world.width, spawnX));
        enemies.push({
            type: typeName,
            x: spawnX,
            y: world.ground,
            width: type.width,
            height: type.height,
            hp: type.hp,
            maxHp: type.hp,
            damage: type.damage,
            speed: type.speed,
            score: type.score,
            attackTimer: 0,
            state: "walk",
            direction: 1,
            lockedDirection: 1,
            animFrame: Math.random() * 100,
            animSpeed: 4 + Math.random() * 4
        });
    }

    // Отрисовка врагов
    function drawEnemies() {
        enemies.forEach(e => {
            const x = e.x - world.cameraX;
            drawAnimatedCharacter(
                x,
                e.y,
                e.width,
                e.height,
                e.state === "attack" ? e.lockedDirection : e.direction,
                e.type,
                e.state,
                e.animFrame
            );
            const barWidth = e.width * 0.6;
            ctx.fillStyle = "#333";
            ctx.fillRect(x - barWidth / 2, e.y - e.height - 14, barWidth, 6);
            ctx.fillStyle = "#ff3d3d";
            ctx.fillRect(x - barWidth / 2, e.y - e.height - 14, barWidth * (e.hp / e.maxHp), 6);
        });
    }

    // Боссы
    function drawBoss() {
        if (!boss) return;
        const x = boss.x - world.cameraX;
        drawAnimatedCharacter(
            x,
            boss.y,
            boss.width,
            boss.height,
            boss.state === "attack" ? boss.lockedDirection : boss.direction,
            boss.type === "king" ? "king" : boss.type,
            boss.state,
            boss.animFrame
        );
        ctx.fillStyle = "#222";
        ctx.fillRect(WIDTH / 2 - 220, 20, 440, 24);
        ctx.fillStyle = "#d32f2f";
        ctx.fillRect(WIDTH / 2 - 220, 20, 440 * (boss.hp / boss.maxHp), 24);
        ctx.strokeStyle = "white";
        ctx.strokeRect(WIDTH / 2 - 220, 20, 440, 24);
        ctx.fillStyle = "white";
        ctx.font = "18px Segoe UI";
        ctx.textAlign = "center";
        ctx.fillText((boss.name || boss.type).toUpperCase(), WIDTH / 2, 16);
        ctx.textAlign = "left";
    }

    // Стрелы
    function drawArrows() {
        const tex = textures.objects.arrow;
        arrows.forEach(a => {
            const x = a.x - world.cameraX;
            if (tex && tex.complete && tex.naturalWidth > 0) {
                ctx.save();
                ctx.translate(x, a.y);
                if (a.direction === -1) ctx.scale(-1, 1);
                ctx.drawImage(tex, -12, -8, 24, 16);
                ctx.restore();
            } else {
                ctx.strokeStyle = "#ffe082";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x, a.y);
                ctx.lineTo(x - 18, a.y);
                ctx.stroke();
            }
        });
    }

    // Дропы (зелья)
    function drawDrops() {
        drops.forEach(d => {
            const x = d.x - world.cameraX;
            let tex = null;
            switch (d.type) {
                case "hp": tex = textures.objects.hp; break;
                case "mp": tex = textures.objects.mp; break;
                case "speed": tex = textures.objects.speed; break;
                case "damage": tex = textures.objects.damage; break;
            }
            if (tex && tex.complete && tex.naturalWidth > 0) {
                ctx.drawImage(tex, x - 16, d.y - 16, 32, 32);
            } else {
                ctx.fillStyle = d.type === "hp" ? "#ff4444" :
                    d.type === "mp" ? "#3aa7ff" :
                    d.type === "speed" ? "#ffe14a" : "#ff8844";
                ctx.beginPath();
                ctx.arc(x, d.y, 14, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    // Логика врагов
    function updateEnemies() {
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            e.direction = player.x < e.x ? -1 : 1;
            const dist = Math.abs(e.x - player.x);

            if (e.state !== "attack") {
                if (dist > 55) {
                    e.x += e.direction * e.speed;
                } else {
                    e.state = "attack";
                    e.lockedDirection = e.direction;
                    e.animFrame = 0;
                    e.attackTimer = 35;
                }
            }

            if (e.state === "attack") {
                e.attackTimer--;
                e.animFrame += 0.18;
                if (e.attackTimer === 18) {
                    if (!player.shield) player.hp -= e.damage;
                }
                if (e.attackTimer <= 0) {
                    e.state = "walk";
                    e.animFrame = 0;
                }
            } else {
                e.animFrame += 0.20;
            }

            if (e.hp <= 0) {
                score += e.score;
                addExperience(e.score * 20);
                enemiesKilled++;
                createDeathEffect(e);
                spawnDrop(e);
                enemies.splice(i, 1);
            }
        }
    }

    // Логика боссов
    function updateBoss() {
        if (!boss || boss.type === "king") return;
        boss.direction = player.x < boss.x ? -1 : 1;
        const speed = boss.rage ? boss.speed * 1.6 : boss.speed;
        const dist = Math.abs(player.x - boss.x);

        if (boss.state !== "attack") {
            if (dist > 75) {
                boss.x += boss.direction * speed;
                boss.animFrame += 0.18;
            } else {
                boss.state = "attack";
                boss.lockedDirection = boss.direction;
                boss.attackTimer = 42;
                boss.animFrame = 0;
            }
        } else {
            boss.attackTimer--;
            boss.animFrame += 0.18;
            if (boss.attackTimer === 22) {
                if (!player.shield) player.hp -= boss.damage;
            }
            if (boss.attackTimer <= 0) {
                boss.state = "walk";
                boss.animFrame = 0;
            }
        }

        if (boss.hp < boss.maxHp * 0.3) boss.rage = true;

        boss.summon--;
        if (boss.summon <= 0) {
            boss.summon = 300;
            spawnEnemy("goblin");
            spawnEnemy("orc");
        }

        if (boss.hp <= 0) {
            score += boss.maxHp / 10;
            addExperience(250);
            createDeathEffect(boss);
            const mini = boss.miniBoss;
            boss = null;
            if (mini) nextLevel();
        }
    }

    // Финальный босс
    function updateFinalBoss() {
        if (!boss || boss.type !== "king") return;
        if (boss.hp < boss.maxHp * 0.7) boss.phase = 2;
        if (boss.hp < boss.maxHp * 0.35) {
            boss.phase = 3;
            boss.rage = true;
        }

        boss.direction = player.x < boss.x ? -1 : 1;
        const speed = boss.rage ? 2.8 : 1.4;
        const dist = Math.abs(player.x - boss.x);

        if (boss.state !== "attack") {
            if (dist > 90) {
                boss.x += boss.direction * speed;
                boss.animFrame += 0.18;
            } else {
                boss.state = "attack";
                boss.lockedDirection = boss.direction;
                boss.attackTimer = 40;
                boss.animFrame = 0;
            }
        } else {
            boss.attackTimer--;
            boss.animFrame += 0.18;
            if (boss.attackTimer === 18) {
                if (!player.shield) player.hp -= boss.damage;
            }
            if (boss.attackTimer <= 0) {
                boss.state = "walk";
                boss.animFrame = 0;
            }
        }

        boss.summon--;
        if (boss.summon <= 0) {
            boss.summon = boss.phase === 1 ? 420 : 240;
            spawnEnemy("orc");
            spawnEnemy("orc");
            if (boss.phase >= 2) spawnEnemy("troll");
        }

        if (boss.hp <= 0) {
            createDeathEffect(boss);
            score += 1000;
            addExperience(1500);
            boss = null;
            endGame(true);
        }
    }

    // Стрельба
    function shootArrow(offsetY = 0) {
        const dir = player.direction;
        arrows.push({
            x: player.x,
            y: player.y - player.height + 118 + offsetY,
            speed: 12 * dir,
            damage: buffs.damage > 0 ? 45 : 30,
            direction: dir
        });
    }

    function updateArrows() {
        for (let i = arrows.length - 1; i >= 0; i--) {
            const a = arrows[i];
            a.x += a.speed;
            if (a.x > world.width || a.x < 0) {
                arrows.splice(i, 1);
                continue;
            }
            let removed = false;
            for (let j = enemies.length - 1; j >= 0; j--) {
                const e = enemies[j];
                if (a.x > e.x - e.width / 2 && a.x < e.x + e.width / 2 && a.y + 4 > e.y - e.height && a.y < e.y) {
                    e.hp -= a.damage;
                    createHit(a.x, a.y);
                    arrows.splice(i, 1);
                    removed = true;
                    break;
                }
            }
            if (removed) continue;
            if (boss) {
                if (a.x + 18 > boss.x && a.x < boss.x + boss.width / 2 && a.y > boss.y - boss.height && a.y < boss.y) {
                    boss.hp -= a.damage;
                    createHit(a.x, a.y);
                    arrows.splice(i, 1);
                    continue;
                }
            }
        }
    }

    // Град стрел
    function updateRain() {
        for (let i = rainArrows.length - 1; i >= 0; i--) {
            const r = rainArrows[i];
            r.y += r.speed;
            for (let j = enemies.length - 1; j >= 0; j--) {
                const e = enemies[j];
                if (Math.abs(r.x - e.x) < 30 && Math.abs(r.y - (e.y - 25)) < 35) {
                    e.hp -= 55;
                }
            }
            if (boss) {
                if (Math.abs(r.x - boss.x) < 60 && Math.abs(r.y - (boss.y - 40)) < 60) {
                    boss.hp -= 25;
                }
            }
            if (r.y > HEIGHT + 50) {
                rainArrows.splice(i, 1);
            }
        }
    }

    // Огненные шары
    function updateFireballs() {
        if (!boss || boss.type !== "king") return;
        boss.fireball--;
        if (boss.fireball <= 0) {
            boss.fireball = boss.phase === 1 ? 170 : 90;
            for (let i = 0; i < 6 + boss.phase; i++) {
                fireballs.push({
                    x: boss.x,
                    y: boss.y - 90,
                    vx: -6 + Math.random() * 12,
                    vy: -8 - Math.random() * 3,
                    r: 12
                });
            }
        }
        for (let i = fireballs.length - 1; i >= 0; i--) {
            const f = fireballs[i];
            f.x += f.vx;
            f.y += f.vy;
            f.vy += 0.28;
            if (Math.abs(f.x - player.x) < 28 && Math.abs(f.y - player.y) < 40) {
                if (!player.shield) player.hp -= 12;
                createHit(f.x, f.y);
                fireballs.splice(i, 1);
                continue;
            }
            if (f.y > HEIGHT + 80) {
                fireballs.splice(i, 1);
            }
        }
    }

    // Частицы
    function createHit(x, y) {
        for (let i = 0; i < 10; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - .5) * 5,
                vy: (Math.random() - .5) * 5,
                life: 25,
                color: "#ffd54f"
            });
        }
    }

    function createDeathEffect(enemy) {
        const color = enemy.color || "#ff4444";
        for (let i = 0; i < 25; i++) {
            particles.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y - enemy.height / 2,
                vx: (Math.random() - .5) * 8,
                vy: (Math.random() - .5) * 8,
                life: 40,
                color: color
            });
        }
    }

    // Дроп система
    function spawnDrop(enemy) {
        const r = Math.random();
        if (r > 0.45) return;
        let type = "hp";
        if (r < 0.15) type = "hp";
        else if (r < 0.30) type = "mp";
        else if (r < 0.38) type = "speed";
        else type = "damage";
        drops.push({
            x: enemy.x,
            y: enemy.y - enemy.height * 0.55,
            vy: -2,
            type: type,
            life: 900,
            angle: 0
        });
    }

    // Обновление частиц
    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15;
            p.life--;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.globalAlpha = p.life / 40;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x - world.cameraX, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    // Обновление дропов
    function updateDrops() {
        for (let i = drops.length - 1; i >= 0; i--) {
            const d = drops[i];
            d.angle += 0.08;
            d.life--;
            d.y += d.vy;
            d.vy += 0.08;
            if (d.y > world.ground - 18) {
                d.y = world.ground - 18;
                d.vy = 0;
            }
            if (Math.abs(d.x - player.x) < 55 && Math.abs(d.y - player.y) < 60) {
                switch (d.type) {
                    case "hp":
                        player.hp = Math.min(player.maxHp, player.hp + 30);
                        break;
                    case "mp":
                        player.mp = Math.min(player.maxMp, player.mp + 35);
                        break;
                    case "speed":
                        buffs.speed = 600;
                        player.speed += 1;
                        break;
                    case "damage":
                        buffs.damage = 600;
                        break;
                }
                drops.splice(i, 1);
                continue;
            }
            if (d.life <= 0) drops.splice(i, 1);
        }
    }

    // Отрисовка града стрел и огненных шаров
    function drawRain() {
        ctx.strokeStyle = "#fff59d";
        ctx.lineWidth = 3;
        rainArrows.forEach(r => {
            ctx.beginPath();
            ctx.moveTo(r.x - world.cameraX, r.y);
            ctx.lineTo(r.x - world.cameraX - 12, r.y - 24);
            ctx.stroke();
        });
    }

    function drawFireballs() {
        fireballs.forEach(f => {
            const x = f.x - world.cameraX;
            const g = ctx.createRadialGradient(x, f.y, 2, x, f.y, f.r);
            g.addColorStop(0, "#fff176");
            g.addColorStop(0.4, "#ff9800");
            g.addColorStop(1, "#d32f2f");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Умения
    function useSkill(id) {
        switch (id) {
            case 1:
                if (player.mp < 5 || cooldowns.shot > 0) return;
                player.mp -= 5;
                cooldowns.shot = 18;
                player.state = "attack";
                player.attackTimer = 20;
                player.animFrame = 0;
                shootArrow();
                break;
            case 2:
                if (player.mp < 20 || cooldowns.shield > 0) return;
                player.mp -= 20;
                cooldowns.shield = 600;
                player.shield = true;
                setTimeout(() => { player.shield = false; }, 5000);
                break;
            case 3:
                if (player.mp < 25 || cooldowns.triple > 0) return;
                player.mp -= 25;
                cooldowns.triple = 180;
                player.state = "attack";
                player.attackTimer = 20;
                player.animFrame = 0;
                shootArrow(-15);
                shootArrow(0);
                shootArrow(15);
                break;
            case 4:
                if (player.mp < 40 || cooldowns.rain > 0) return;
                player.mp -= 40;
                cooldowns.rain = 900;
                for (let i = 0; i < 45; i++) {
                    rainArrows.push({
                        x: player.x - 250 + Math.random() * 500,
                        y: -Math.random() * 600,
                        speed: 10 + Math.random() * 6
                    });
                }
                break;
        }
    }

    // Перезарядка
    function updateCooldowns() {
        for (const key in cooldowns) {
            if (cooldowns[key] > 0) cooldowns[key]--;
        }
    }

    // Баффы
    function updateBuffs() {
        if (buffs.speed > 0) {
            buffs.speed--;
            if (buffs.speed === 0) player.speed -= 1;
        }
        if (buffs.damage > 0) buffs.damage--;
    }

    // Таймер
    setInterval(() => {
        if (!gameRunning || paused) return;
        gameSeconds++;
        const m = Math.floor(gameSeconds / 60);
        const s = gameSeconds % 60;
        timerDisplay.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    }, 1000);

    // Спавнер волн
    let spawnTimer = 120;

    function updateSpawner() {
        if (levelChanging) {
            levelTitleTimer--;
            if (levelTitleTimer <= 0) levelChanging = false;
            return;
        }
        if (boss && boss.type === "king") return;
        const wave = getWave();
        if (!wave) return;
        spawnTimer--;
        if (spawnTimer > 0) return;
        spawnTimer = 50 + Math.random() * 40;
        if (enemiesSpawned >= wave.amount) {
            if (enemies.length === 0) nextWave();
            return;
        }
        const list = wave.enemies;
        const type = list[Math.floor(Math.random() * list.length)];
        spawnEnemy(type);
        enemiesSpawned++;
    }

    // Боссы
    function spawnBoss(type) {
        const t = enemyTypes[type];
        boss = {
            type: type,
            x: player.x + 700,
            y: world.ground,
            width: t.width,
            height: t.height,
            hp: t.hp,
            maxHp: t.hp,
            damage: t.damage,
            speed: t.speed,
            attack: 0,
            summon: 240,
            rage: false,
            direction: 1,
            lockedDirection: 1,
            state: "walk",
            miniBoss: true,
            animFrame: 0
        };
    }

    function spawnFinalBoss() {
        boss = {
            type: "king",
            name: "Король Орков",
            x: player.x + 800,
            y: world.ground,
            width: 300,
            height: 350,
            hp: 1800,
            maxHp: 1800,
            damage: 25,
            speed: 1.2,
            attack: 0,
            summon: 420,
            fireball: 180,
            dash: 360,
            phase: 1,
            rage: false,
            direction: 1,
            lockedDirection: 1,
            state: "walk",
            animFrame: 0
        };
    }

    // Игровой цикл
    function gameLoop() {
        if (!gameRunning) return;
        if (paused) {
            requestAnimationFrame(gameLoop);
            return;
        }

        updatePlayer();
        updateSpawner();
        updateEnemies();
        updateBoss();
        updateFinalBoss();
        updateFireballs();
        updateArrows();
        updateRain();
        updateParticles();
        updateDrops();
        updateBuffs();
        updateCooldowns();
        updateUI();

        drawBackground();
        drawEnemies();
        drawBoss();
        drawPlayer();
        drawArrows();
        drawRain();
        drawFireballs();
        drawParticles();
        drawDrops();
        drawHUD();
        drawXP();
        drawLevelUp();
        drawLevelTitle();

        if (player.hp <= 0) {
            endGame(false);
            return;
        }

        requestAnimationFrame(gameLoop);
    }

    // Старт игры
    function startGame() {
        score = 0;
        gameSeconds = 0;
        player.hp = player.maxHp;
        player.mp = player.maxMp;
        player.x = 180;
        player.shield = false;

        enemies.length = 0;
        arrows.length = 0;
        rainArrows.length = 0;
        particles.length = 0;
        fireballs.length = 0;
        drops.length = 0;
        boss = null;

        currentLevel = 0;
        currentWave = 0;
        enemiesKilled = 0;
        enemiesSpawned = 0;

        startLevel(0);

        startScreen.classList.remove("active");
        endScreen.classList.remove("active");
        gameScreen.classList.add("active");

        gameRunning = true;
        paused = false;

        gameLoop();
    }

    // Конец игры
    function endGame(win) {
        gameRunning = false;
        gameScreen.classList.remove("active");
        endScreen.classList.add("active");

        const result = document.getElementById("gameResult");
        const container = document.getElementById("resultsContainer");

        result.textContent = win ? "🏆 Победа" : "💀 Поражение";

        container.innerHTML = `
            <p><b>Игрок:</b> ${playerName.value}</p>
            <p><b>Убийств:</b> ${score}</p>
            <p><b>Время:</b> ${timerDisplay.textContent}</p>
        `;
    }

    // Управление
    document.addEventListener("keydown", e => {
        keys[e.key] = true;
        if (e.key === "Escape") {
            if (!gameRunning) return;
            paused = !paused;
            pauseScreen.classList.toggle("active");
        }
        if (e.key === "1") useSkill(1);
        if (e.key === "2") useSkill(2);
        if (e.key === "3") useSkill(3);
        if (e.key === "4") useSkill(4);
    });

    document.addEventListener("keyup", e => {
        keys[e.key] = false;
    });

    // Кнопки
    playerName.addEventListener("input", () => {
        startBtn.disabled = playerName.value.trim().length === 0;
    });

    startBtn.addEventListener("click", startGame);

    restartBtn.addEventListener("click", () => {
        location.reload();
    });

    exitBtn.addEventListener("click", () => {
        paused = false;
        gameRunning = false;
        pauseScreen.classList.remove("active");
        gameScreen.classList.remove("active");
        endScreen.classList.remove("active");
        startScreen.classList.add("active");
    });

    updateUI();

});
