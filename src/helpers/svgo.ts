export async function getOptimize() {
  try {
    const { optimize } = await import('svgo')
    return optimize
  }
  catch {
    return false
  }
}

export function check() {
  try {
    import('svgo')
    return true
  }
  catch {
    return false
  }
}
