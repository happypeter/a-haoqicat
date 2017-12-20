let spawn = require('child_process').spawn

module.exports = function(args, repo, fn) {
  let stdout = ''
  let stderr = ''
  let childArgs = ['show', '--no-color', '--pretty=format:%b']
  if (args) {
    childArgs = childArgs.concat(args.split(/\s/))
  }

  let child = spawn('git', childArgs, {cwd: repo})
  child.stdout.on('data', function(chunk) {
    stdout += chunk
  })
  child.stderr.on('data', function(chunk) {
    stderr += chunk
  })
  child.on('close', function(code) {
    if (code !== 0) {
      let error = new Error(stderr)
      error.code = code
      fn(error)
    } else if (!stdout.length) {
      fn(null, null)
    } else {
      fn(null, splitByFile(stdout))
    }
  })
}

function splitByFile(diff) {
  let filename
  let isEmpty = true
  let files = {}

  diff.split('\n').forEach(function(line, i) {
    // Unmerged paths, and possibly other non-diffable files
    // https://github.com/scottgonzalez/pretty-diff/issues/11
    if (!line || line.charAt( 0 ) === '*') {
      return
    }
    let reg = /^diff --(?:cc |git a\/)(\S+).*$/
    if (reg.test(line)) {
      isEmpty = false
      filename = line.replace(/^diff --(?:cc |git a\/)(\S+).*$/, '$1')
      files[filename] = []
    }
    files[filename].push(line)
  })

  return isEmpty ? null : files
}
