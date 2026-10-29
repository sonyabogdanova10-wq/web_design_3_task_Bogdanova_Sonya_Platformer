const EPS = 0.01;

export function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function verticalOverlap(y, height, rect) {
  return y < rect.y + rect.height && y + height > rect.y;
}

function horizontalOverlap(x, width, rect) {
  return x < rect.x + rect.width && x + width > rect.x;
}

// Проверяем, является ли платформа "one-way" — проходимой снизу и с боков
function isOneWay(platform) {
  return platform.oneWay === true || platform.type === "branch";
}

export function resolveHorizontal(entity, prevX, newX, platforms) {
  let x = newX;
  let hit = false;
  const { y, width, height } = entity;

  // Движение вправо
  if (x > prevX) {
    for (const p of platforms) {
      if (isOneWay(p)) continue; // one-way платформы проходимы с боков
      if (
        prevX + width <= p.x + EPS &&
        x + width >= p.x - EPS &&
        verticalOverlap(y, height, p)
      ) {
        const blockedX = p.x - width;
        if (blockedX < x) {
          x = blockedX;
        }
        hit = true;
      }
    }
  }

  // Движение влево
  if (x < prevX) {
    for (const p of platforms) {
      if (isOneWay(p)) continue; // one-way платформы проходимы с боков
      if (
        prevX >= p.x + p.width - EPS &&
        x <= p.x + p.width + EPS &&
        verticalOverlap(y, height, p)
      ) {
        const blockedX = p.x + p.width;
        if (blockedX > x) {
          x = blockedX;
        }
        hit = true;
      }
    }
  }

  return { x, hit };
}

export function resolveVertical(entity, prevY, newY, platforms) {
  let y = newY;
  let vy = entity.vy;
  let onGround = false;
  const { x, width, height } = entity;

  // Движение вниз — возможное приземление
  if (y > prevY) {
    for (const p of platforms) {
      if (
        prevY + height <= p.y + EPS &&
        y + height >= p.y - EPS &&
        horizontalOverlap(x, width, p)
      ) {
        const landingY = p.y - height;
        if (landingY < y) {
          y = landingY;
        }
        vy = 0;
        onGround = true;
      }
    }
  }

  // Движение вверх — удар головой о платформу
  if (y < prevY) {
    for (const p of platforms) {
      if (isOneWay(p)) continue; // one-way платформы проходимы снизу
      if (
        prevY >= p.y + p.height - EPS &&
        y <= p.y + p.height + EPS &&
        horizontalOverlap(x, width, p)
      ) {
        const ceilingY = p.y + p.height;
        if (ceilingY > y) {
          y = ceilingY;
        }
        vy = 0;
      }
    }
  }

  return { y, vy, onGround };
}