module.exports.runManyOn = (method, options , paths = [], absPath = [], silent = false) => {
  paths.forEach((path, index) => {
    try {
      if (!absPath[index]) {
        return method?.(path, options);
      }

      // for symlinkSync
      method?.(path, absPath[index], options)

    } catch (e) {
      if(!silent) {
        console.warn(`cant do action on ${path}, because`, e)
      }
    }
  })
}
