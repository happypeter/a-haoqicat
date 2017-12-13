const fs = require('fs')
const { exec } = require('child_process')
const path = require( "path" )
const diff = require('./diff')

function readFile(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if(err) {
        return reject()
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
  let template = fs.readFileSync(__dirname + '/' + process.argv[2], 'utf8')
  let diffHtml = ''

  for (let file in parsedDiff) {
    diffHtml += "<h2>" + file + "</h2>\n" +
    "<div class='file-diff'>\n<div>\n" +
    markUpDiff( parsedDiff[file] ) +
    "\n</div>\n</div>"
  }

  const regex = new RegExp(line)
  fs.writeFileSync('test.md', template.replace(regex, diffHtml))
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

  function escape(str) {
    return str
      .replace( /&/g, '&amp;' )
      .replace( /</g, '&lt;' )
      .replace( />/g, '&gt;' )
      .replace( /\t/g, '    ' );
  }

	return function(diff) {
    let tmp = []
    let marker = false
    let idx
    diff.forEach((line, index) => {
      let type = line.charAt(0)
      if (type === '@' && marker === false) {
        marker = true
        idx = index
      }
      let text
      type === '@' ? text = line : text = line.slice(1)
      tmp.push("<pre class='" + diffClasses[type] + "'>" + escape(text) + "</pre>")
    })
    return tmp.slice(idx).join('\n')
  }
}()


const mdFile = process.argv[2]

readFile(mdFile)
  .then(data => {
    return commits(data)
  })
  .then(commits => {
    commits.forEach(item => {
      getDiff(item)
    })
  })
  .catch(err => {
    console.log(err)
  })
