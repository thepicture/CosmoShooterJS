'use strict';

const GAME_WIDTH = 15;
const GAME_HEIGHT = 15;
const BLOCK_SIZE = 40;
const DELTA_SPEED = 5;
const GAME_UPDATE_SPEED_MS = 0;
const SHOOT_SPEED = 100;
const BULLET_SPEED = 1;
const BULLET_SCALE_FACTOR = 8;
const ENEMY_SPEED = 1;
const ENEMY_CREATING_SPEED = 300;
const INVINCIBLE_TIME_MS = 200;
const STAR_CREATING_SPEED_MS = 20;
const MAX_STARS_COUNT = 50;
const TACTIC_CHANGE_INTERVAL_MS = 5000;
const DIE_ANIMATION_DURATION_MS = 100;

const game = document.querySelector('.game');

game.style.width = GAME_WIDTH * BLOCK_SIZE + 'px';
game.style.height = GAME_HEIGHT * BLOCK_SIZE + 'px';

const playGround = document.querySelector('.playground');

playGround.style.left = BLOCK_SIZE + game.offsetLeft + 'px';
playGround.style.top = BLOCK_SIZE + game.offsetTop + 'px';

playGround.style.width = game.clientWidth - BLOCK_SIZE * 2 + 'px';
playGround.style.height = game.clientHeight - BLOCK_SIZE * 4 + 'px';

const plane = document.querySelector('.plane');

plane.style.width = plane.style.height = BLOCK_SIZE + 'px';

let aliveEnemies = new Set();

const healthMeter = document.querySelector('.health-meter');

healthMeter.style.left = playGround.offsetLeft + "px";
healthMeter.style.top = playGround.offsetTop + playGround.clientHeight + BLOCK_SIZE + "px";

healthMeter.style.width = BLOCK_SIZE * 4 + "px";
healthMeter.style.height = BLOCK_SIZE + "px";

const info = document.querySelector('.info');

info.style.left = playGround.offsetLeft + "px";
info.style.top = playGround.offsetTop + BLOCK_SIZE + "px";
info.style.width = playGround.clientWidth + "px";

const interfaceButton = document.querySelector('.interface-button');

interfaceButton.style.left = playGround.offsetLeft + playGround.clientWidth - interfaceButton.clientWidth + "px";
interfaceButton.style.top = playGround.offsetTop + playGround.clientHeight + BLOCK_SIZE + "px";

const score = document.querySelector('.score');

score.style.left = playGround.offsetLeft + (playGround.clientWidth - score.clientWidth) / 2 + "px";
score.style.top = playGround.offsetTop + playGround.clientHeight + BLOCK_SIZE + "px";

let isGameStarted = false;

class Plane {
    static isShooting = false;
    static health = 100;
    static isCheckingIntersections = false;

    constructor() {
    }

    static moveLeft() {
        if (this.canMoveLeft()) {
            plane.style.left = plane.offsetLeft - DELTA_SPEED + 'px';
        }
    }

    static moveRight() {
        if (this.canMoveRight()) {
            plane.style.left = plane.offsetLeft + DELTA_SPEED + 'px';
        }
    }

    static moveDown() {
        if (this.canMoveDown()) {
            plane.style.top = plane.offsetTop + DELTA_SPEED + 'px';
        }
    }

    static moveUp() {
        if (this.canMoveUp()) {
            plane.style.top = plane.offsetTop - DELTA_SPEED + 'px';
        }
    }

    static canMoveLeft() {
        return plane.offsetLeft >= playGround.offsetLeft + playGround.clientLeft;
    }

    static canMoveRight() {
        return plane.offsetLeft + plane.clientWidth <= playGround.offsetLeft + playGround.clientWidth - playGround.clientLeft;
    }

    static canMoveDown() {
        return plane.offsetTop + plane.clientHeight <= playGround.offsetTop + playGround.clientHeight + playGround.clientTop;
    }

    static canMoveUp() {
        return plane.offsetTop >= playGround.offsetTop + playGround.clientTop * 2;
    }

    static getX() {
        return plane.offsetLeft;
    }

    static getY() {
        return plane.offsetTop;
    }

    static shoot() {
        if (this.isShooting) return;

        this.isShooting = true;

        if (
            playGround.offsetLeft +
            playGround.clientWidth -
            plane.offsetLeft + plane.clientWidth <
            plane.clientWidth
        ) {
            return;
        }
        this.shootInterval = setInterval(() => {
            InGameSound.play('plane-shoot');
            BulletFactory.createBullet(this.getX(), this.getY());
        }, SHOOT_SPEED);
    }

    static stopShooting() {
        if (this.isShooting) {
            clearInterval(this.shootInterval);
            this.shootInterval = null;
            this.isShooting = false;
        }
    }

    static checkIntersections() {
        for (let enemy of aliveEnemies) {
            let enemyElement = enemy.enemyElement;

            let enemyLeft = enemyElement.offsetLeft;
            let enemyRight = enemyElement.offsetLeft + enemyElement.clientWidth;

            let enemyTop = enemyElement.offsetTop;
            let enemyBottom = enemyElement.offsetTop + enemyElement.clientHeight;

            let planeLeft = plane.offsetLeft;
            let planeRight = plane.offsetLeft + plane.clientWidth;

            let planeTop = plane.offsetTop;
            let planeBottom = plane.offsetTop + plane.clientHeight;

            if (planeLeft < enemyRight
                && planeRight > enemyLeft
                && planeTop < enemyBottom
                && planeBottom > enemyTop) {
                this.hurt();
            }
        }

        healthMeter.textContent = String(this.health);
        healthMeter.value = this.health;
    }

    static hurt() {
        if (this.isCheckingIntersections) return;

        this.isCheckingIntersections = true;

        InGameSound.play('plane-hurt');
        this.animateHurt();
        this.health -= 10;

        if (this.health <= 0) {
            this.initiateDeath();
        }

        setTimeout(() => {
            this.isCheckingIntersections = false;
        }, INVINCIBLE_TIME_MS);
    }

    static initiateDeath() {
        InGameSound.play('plane-death');
        GameEventObserver.disconnect();
        EnemyFactory.disconnect();
        Info.setAsGameOver();
        Info.show();
        plane.hidden = true;

        isGameStarted = false;
        interfaceButton.hidden = false;
    }

    static restartHealth() {
        this.health = 100;
        healthMeter.value = 100;
    }

    static setOnCenter() {
        plane.style.left =
            playGround.offsetLeft + playGround.clientWidth / 2 - BLOCK_SIZE + 'px';
        plane.style.top =
            playGround.offsetLeft + playGround.clientHeight / 2 - BLOCK_SIZE + 'px';
    }

    static animateHurt() {
        plane.style.filter = "invert(22%) sepia(97%) saturate(7455%) hue-rotate(300deg) brightness(93%) contrast(116%)";
        let timeout = setTimeout(() => {
            plane.style.filter = "none";
            clearInterval(timeout);
            timeout = null;
        }, DIE_ANIMATION_DURATION_MS);
    }
}

class InGameSound {
    constructor() {
    }

    static play(audioName, isLoop = false, volume = 1) {
        let element = document.querySelector("#" + audioName);
        element.volume = volume;
        element.loop = isLoop;
        element.currentTime = 0;
        element.play();
    }

}

class BulletFactory {
    static bulletSet = new Set();

    static createBullet(x, y, isKillsPlayer = false, enemy) {
        let bullet = document.createElement('div');
        bullet.style.width = plane.clientWidth + 'px';
        bullet.style.height = plane.clientHeight / BULLET_SCALE_FACTOR + 'px';
        bullet.isKillsPlayer = isKillsPlayer;

        if (!isKillsPlayer) {
            bullet.style.left = x + plane.clientWidth + 'px';
            bullet.style.top =
                y +
                (plane.clientHeight - bullet.clientHeight) / 2 -
                plane.clientHeight / BULLET_SCALE_FACTOR / 2 +
                'px';
        } else {
            bullet.style.left = x - enemy.clientWidth + 'px';
            bullet.style.top =
                y +
                (enemy.clientHeight - enemy.clientHeight) / 2 -
                enemy.clientHeight / BULLET_SCALE_FACTOR / 2 +
                'px';
        }

        bullet.classList.add('bullet');
        let interval = setInterval(() => {
            if (!isKillsPlayer) {
                let intersectedEnemy = this.findIntersectedEnemy(bullet);

                if (intersectedEnemy) {
                    intersectedEnemy.destroy();
                    this.destroy(bullet, interval);
                    Score.add(10);
                    InGameSound.play('enemy-death');
                    return;
                }
            } else if (this.isIntersectedPlane(bullet)) {
                Plane.hurt();
            }

            bullet.style.left = bullet.offsetLeft + (isKillsPlayer ? -1 : 1) * DELTA_SPEED + 'px';

            if (bullet.offsetLeft + bullet.clientWidth > playGround.offsetLeft + playGround.clientWidth
                || bullet.offsetLeft < playGround.offsetLeft + plane.clientLeft) {
                this.destroy(bullet, interval);

            }
        }, BULLET_SPEED);

        document.body.append(bullet);

        this.bulletSet.add(bullet);
    }

    static destroy(bullet, interval) {
        this.bulletSet.delete(bullet);
        bullet.remove();
        clearInterval(interval);
        interval = null;
    }

    static findIntersectedEnemy(bullet) {
        for (let enemy of aliveEnemies) {
            if (bullet.offsetLeft + bullet.clientWidth > enemy.enemyElement.offsetLeft
                && bullet.offsetLeft + bullet.clientWidth < enemy.enemyElement.offsetLeft + enemy.enemyElement.clientWidth
                && enemy.enemyElement.offsetTop < bullet.offsetTop
                && enemy.enemyElement.offsetTop + enemy.enemyElement.clientHeight > bullet.offsetTop) {
                return enemy;
            }
        }
    }

    static isIntersectedPlane(bullet) {
        return bullet.offsetLeft + bullet.clientWidth > plane.offsetLeft
            && bullet.offsetLeft + bullet.clientWidth < plane.offsetLeft + plane.clientWidth
            && plane.offsetTop < bullet.offsetTop
            && plane.offsetTop + plane.clientHeight > bullet.offsetTop;
    }
}

class SecureKeyLogger {
    static keySet = new Set();

    constructor() {
    }

    static write(key) {
        this.keySet.add(key);
    }

    static getKeys() {
        return this.keySet;
    }

    static delete(key) {
        this.keySet.delete(key);
    }
}

class Enemy {
    movingTactic;
    movingInterval;
    enemyElement;
    deltaX;
    deltaY;
    customObject = {};
    isShooting = false;
    shootInterval;

    constructor(x, y, movingTactic, deltaX = 1, deltaY = 1) {
        let enemyElement = document.createElement('div');

        enemyElement.classList.add('enemy');
        enemyElement.style.width = enemyElement.style.height = BLOCK_SIZE + 'px';
        enemyElement.style.left = x + 'px';
        enemyElement.style.top = y + 'px';

        document.body.append(enemyElement);

        aliveEnemies.add(this);

        this.enemyElement = enemyElement;
        this.movingTactic = movingTactic;
        this.deltaX = deltaX;
        this.deltaY = deltaY;
    }

    generate() {
        if (!isGameStarted) return;

        if (!this.movingInterval) {
            this.movingInterval = setInterval(() => {
                if (this.enemyElement.offsetLeft < playGround.offsetLeft + playGround.clientLeft) {
                    this.destroy();
                }
                this.movingTactic(this, this.deltaX, this.deltaY, this.customObject);
            }, ENEMY_SPEED);
        }
    }

    destroy() {
        if (this.movingInterval) {
            aliveEnemies.delete(this);
            this.enemyElement.remove();
            clearInterval(this.movingInterval);
            this.movingInterval = null;
        }
    }

    shoot() {
        if (this.isShooting) return;

        this.isShooting = true;

        if (
            playGround.offsetLeft +
            playGround.clientWidth -
            plane.offsetLeft + plane.clientWidth <
            plane.clientWidth
        ) {
            return;
        }
        this.shootInterval = setInterval(() => {
            InGameSound.play('enemy-shoot');
            BulletFactory.createBullet(this.getX(), this.getY(), true, this.enemyElement);
        }, SHOOT_SPEED);
    }

    stopShooting() {
        if (this.isShooting) {
            clearInterval(this.shootInterval);
            this.shootInterval = null;
            this.isShooting = false;
        }
    }

    getX() {
        return this.enemyElement.offsetLeft;
    }

    getY() {
        return this.enemyElement.offsetTop;
    }
}

class TacticHolder {
    static tacticMap = new Map();
    static tacticArray = [];

    constructor() {
    }

    static addTactic(tacticName, callback) {
        this.tacticMap.set(tacticName, callback);
    }

    static removeTactic(tacticName) {
        if (this.tacticMap.has(tacticName)) {
            this.tacticMap.delete(tacticName);
            return true;
        } else {
            return false;
        }
    }

    static getTactic(tacticName) {
        if (this.tacticMap.has(tacticName)) {
            return this.tacticMap.get(tacticName);
        }
    }

    static getRandomTactic() {
        if (this.tacticMap.size !== 0) {
            let callbacks = [];

            for (let key of this.tacticMap.keys()) {
                callbacks.push(this.tacticMap.get(key));
            }

            return callbacks[Math.floor(Math.random() * callbacks.length)];
        }
    }
}

class EnemyFactory {
    static producingInterval;
    static currentTactic
    static tacticInterval;

    constructor() {
    }

    static connect() {
        this.currentTactic = TacticHolder.getRandomTactic();

        this.tacticInterval = setInterval(() => {
            this.currentTactic = TacticHolder.getRandomTactic();
        }, TACTIC_CHANGE_INTERVAL_MS);

        if (!this.producingInterval) {
            this.producingInterval = setInterval(() => {
                this.createEnemy(this.currentTactic);
            }, ENEMY_CREATING_SPEED);
        }
    }

    static disconnect() {
        if (this.producingInterval) {
            clearInterval(this.producingInterval);
            this.producingInterval = null;
            clearInterval(this.tacticInterval);
            this.tacticInterval = null;
        }
    }

    static createEnemy(tactic) {
        let originX = playGround.offsetLeft + playGround.offsetWidth - BLOCK_SIZE;
        let originY = Math.floor(
            playGround.offsetTop +
            playGround.offsetHeight -
            Math.random() * playGround.clientHeight
        );
        let enemy;

        if (tactic) {
            enemy = new Enemy(originX, originY, tactic);
            enemy.generate();
        } else {
            throw new CosmoShooterError(
                'No tactic was given for an enemy at EnemyFactory'
            );
        }
    }
}

class CosmoShooterError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CosmoShooterError';
    }
}

class GameEventObserver {
    static interval;

    constructor() {
    }

    static observe() {
        plane.hidden = false;

        this.interval = setInterval(() => {
            Plane.checkIntersections();

            let heldKeys = SecureKeyLogger.getKeys();

            if (heldKeys.has('Escape')) {
                Plane.initiateDeath();
            }

            if (heldKeys.has('KeyA')) {
                Plane.moveLeft();
            }
            if (heldKeys.has('KeyD')) {
                Plane.moveRight();
            }

            if (heldKeys.has('KeyW')) {
                Plane.moveUp();
            }
            if (heldKeys.has('KeyS')) {
                Plane.moveDown();
            }

            if (heldKeys.has('Space')) {
                Plane.shoot();
            }
        }, GAME_UPDATE_SPEED_MS);
    }

    static disconnect() {
        clearInterval(this.interval);
        this.interval = null;
    }
}

class StarGenerator {
    static interval;
    static starSet = new Set();

    constructor() {
    }

    static connect() {
        this.interval = setInterval(() => {
            if (this.starSet.size > MAX_STARS_COUNT) {
                return;
            }
            let star = document.createElement('div');
            star.classList.add('star');
            star.style.opacity = Math.random().toString();

            star.style.left = playGround.offsetLeft + playGround.clientWidth + "px";
            star.style.top = Math.floor(playGround.offsetTop + playGround.clientTop + (playGround.clientHeight - playGround.clientTop) * Math.random()) + "px";
            star.speed = Math.floor(Math.random() * (5 - 1) + 1);

            this.starSet.add(star);

            document.body.append(star);

            let innerInterval = setInterval(() => {
                if (star.offsetLeft < playGround.offsetLeft + playGround.clientLeft) {
                    this.starSet.delete(star);
                    star.remove();
                    star = null;

                    clearInterval(innerInterval);
                    innerInterval = null;
                    return;
                }

                star.style.left = star.offsetLeft - star.speed + "px";
            }, GAME_UPDATE_SPEED_MS);
        }, STAR_CREATING_SPEED_MS);
    }

    static disconnect() {
        clearInterval(this.interval);
        this.interval = null;

        this.starSet.forEach(s => s.remove());
        this.starSet.clear();
    }
}

class Score {
    static scoreValue;

    constructor() {
    }

    static add(value) {
        this.scoreValue += value;
        score.textContent = this.scoreValue;
    }

    static restart() {
        this.scoreValue = 0;
        score.textContent = this.scoreValue;
    }
}

class Info {
    constructor() {
    }

    static setText(text) {
        info.textContent = text;
    }

    static setAsGameOver() {
        this.setText("Game over");
    }

    static setAsTitle() {
        this.setText("CosmoShooterJS");
    }

    static hide() {
        info.hidden = true;
    }

    static show() {
        info.hidden = false;
    }
}

document.addEventListener('keydown', (event) => {
    event.preventDefault();
    SecureKeyLogger.write(event.code);
});

document.addEventListener('keyup', (event) => {
    Plane.stopShooting();
    SecureKeyLogger.delete(event.code);
});

TacticHolder.addTactic('sinMoving', (enemy, dx, dy, obj) => {
    if (!obj.hasOwnProperty("counter")) {
        obj.counter = 0;
    }

    enemy.enemyElement.style.left = enemy.enemyElement.offsetLeft - dx + 'px';
    enemy.enemyElement.style.top =
        ((playGround.offsetTop + playGround.clientHeight - 2 * enemy.enemyElement.clientHeight) /
            2) *
        (1 + Math.sin((obj.counter++ * Math.PI / 180))) +
        enemy.enemyElement.clientHeight + 2 * playGround.clientTop +
        'px';
});
TacticHolder.addTactic('cosMoving', (enemy, dx, dy, obj) => {
    if (!obj.hasOwnProperty("counter")) {
        obj.counter = 0;
    }

    enemy.enemyElement.style.left = enemy.enemyElement.offsetLeft - dx + 'px';
    enemy.enemyElement.style.top = ((playGround.offsetTop + playGround.clientHeight - 2 * enemy.enemyElement.clientHeight) /
            2) *
        (1 + Math.cos((obj.counter++ * Math.PI / 180))) +
        enemy.enemyElement.clientHeight + 2 * playGround.clientTop +
        'px';
});
TacticHolder.addTactic('absMoving', (enemy, dx, dy, obj) => {
    if (!obj.hasOwnProperty("isDown")) {
        obj.isDown = new Date().getTime() % 2;
    }
    if (!obj.hasOwnProperty("timeoutShoot")) {
        enemy.shoot();
        obj.timeoutShoot = setTimeout(() => {
            enemy.stopShooting();
            clearTimeout(obj.timeoutShoot);
            obj.timeoutShoot = null;
        }, 200);
    }

    if (enemy.enemyElement.offsetTop < playGround.offsetTop + playGround.clientTop) {
        obj.isDown = true;
    }

    if (enemy.enemyElement.offsetTop + enemy.enemyElement.clientHeight > playGround.offsetTop + playGround.clientHeight - playGround.clientTop) {
        obj.isDown = false;
    }


    enemy.enemyElement.style.left = enemy.enemyElement.offsetLeft - dx + 'px';

    if (obj.isDown) {
        enemy.enemyElement.style.top = enemy.enemyElement.offsetTop + dy + "px";
    } else {
        enemy.enemyElement.style.top = enemy.enemyElement.offsetTop - dy + "px";
    }
})
;

StarGenerator.connect();

interfaceButton.addEventListener('click', () => {
    Score.restart();
    Plane.setOnCenter();
    Plane.restartHealth();
    Info.hide();
    isGameStarted = true;
    interfaceButton.hidden = true;
    GameEventObserver.observe();
    EnemyFactory.connect();
    InGameSound.play("ingame-sound", true, 0.4);
});