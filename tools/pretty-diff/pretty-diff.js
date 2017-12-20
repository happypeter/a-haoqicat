const fs = require('fs')
const { exec } = require('child_process')
const diff = require('./diff')

function readFile(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if(err) {
        return reject(err)
      }
      return resolve(data)
    })
  })
}

function commits(data) {
  let commits = []
  data.split('\n').forEach((line, index) => {
    const regex = /^([a-z0-9]{7})\-{2}.+$/
    if (regex.test(line)) {
      commits.push({
        commit: line.replace(regex, '$1'),
        line: line
      })
    }
  })

  return Promise.resolve(commits)
}

function getDiff(data) {
  const repo = process.argv[3]

  diff(data.commit, repo, function(error, parsedDiff) {
    if (error) {
      // Usage error, assume we're not in a git directory
      if (error.code === 129) {
        process.stderr.write("Error: Not a git repository\n")
        return
      }
      process.stderr.write(error.message)
      return
    }
    if (!parsedDiff) {
      console.log("No differences")
      return
    }

    generatePrettyDiff(parsedDiff, data.line)
  })
}

function generatePrettyDiff(parsedDiff, line) {
  let mdPath = __dirname + '/' + process.argv[2]
  let md = fs.readFileSync(mdPath, 'utf8')
  let diffHtml = '```\n'

  for (let file in parsedDiff) {
    diffHtml += file + '\n' +
      markUpDiff(parsedDiff[file]) +
    '\n'
  }

  diffHtml += '```\n'

  const regex = new RegExp(line)
  fs.writeFileSync(mdPath, md.replace(regex, diffHtml))
}

let markUpDiff = function() {
  let diffClasses = {
    'd': 'file',
    'i': 'file',
    '@': 'info',
    '-': 'delete',
    '+': 'insert',
    ' ': 'context'
  }

  return function(diff) {
    let idx
    for (let i = 0; i < diff.length; i++) {
      let type = diff[i].charAt(0)
      if (type === '@') {
        idx = i
        break
      }
    }
    return diff.slice(idx).join('\n')
  }
}()


const mdFile = process.argv[2]

readFile(mdFile)
  .then(data => {
    return commits(data)
  })
  .then(commits => {
    console.log('commits', commits)
    commits.forEach(item => {
      getDiff(item)
    })
  })
  .catch(err => {
    console.log(err)
  })
