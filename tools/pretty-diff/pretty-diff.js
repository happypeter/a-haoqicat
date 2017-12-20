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

function getDiff(data, filePath) {
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

    generatePrettyDiff(parsedDiff, data.line, filePath)
  })
}

function generatePrettyDiff(parsedDiff, line, filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  let diffHtml = '```\n'

  for (let file in parsedDiff) {
    let str = markUpDiff(parsedDiff[file])
    if(str) {
      diffHtml += file + '\n' + str + '\n'
    }
  }

  diffHtml += '```\n'

  const regex = new RegExp(line)
  fs.writeFileSync(filePath, content.replace(regex, diffHtml))
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
    if (idx) {
      return diff.slice(idx).join('\n')
    } else {
      return
    }
  }
}()


const mdDir = process.argv[2]

fs.readdirSync(mdDir).forEach(file => {
  if (file.split('.')[1] !== 'md') return
  let filePath = `${mdDir}/${file}`
  readFile(filePath)
    .then(data => {
      return commits(data)
    })
    .then(commits => {
      commits.forEach(item => {
        getDiff(item, filePath)
      })
    })
    .catch(err => {
      console.log(err)
    })
})
