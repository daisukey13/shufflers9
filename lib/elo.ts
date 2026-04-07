const K_FACTOR = 32

/**
 * 期待勝率を計算
 */
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

/**
 * Eloレーティングの変動を計算
 * @returns { changeA, changeB, newRatingA, newRatingB }
 */
export function calcElo(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  scoreB: number
): {
  changeA: number
  changeB: number
  newRatingA: number
  newRatingB: number
} {
  const expected = expectedScore(ratingA, ratingB)

  let resultA: number
  if (scoreA > scoreB) resultA = 1
  else if (scoreA < scoreB) resultA = 0
  else resultA = 0.5

  const changeA = Math.round(K_FACTOR * (resultA - expected))
  const changeB = -changeA

  return {
    changeA,
    changeB,
    newRatingA: ratingA + changeA,
    newRatingB: ratingB + changeB,
  }
}