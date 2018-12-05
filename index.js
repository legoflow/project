'use strict'

const chalk = require('chalk')
const globby = require('globby')
const glob = require('glob')
const path = require('path')
const fs = require('fs-extra')
const YAML = require('yamljs')
const shell = require('shelljs')
const formatYamlFile = require('format-yaml')
const gitDownload = require('download-git-repo')
const del = require('del')
const ora = require('ora')

const replaceInfo = ({ name, version, c_version: cVersion, author, isESNext, type }, str) => {
  return str
    // 替换 项目名称
    .replace(/\[name\]/g, name)
    // 替换 项目版本号
    .replace(/\[version\]/g, version)
    // 替换 开发者用户
    .replace(/\[author\]/g, author)
    // 替换 lf 版本
    .replace(/\[c_version\]/g, cVersion)
    // 替换 项目类型
    .replace(/\[type\]/g, type)
    // 替换 是否使用 ESNext
    .replace(/\[ESNext\]/g, isESNext)
}

// 获取项目模板
const getProjectType = () => {
  const { project } = JSON.parse(fs.readFileSync(path.resolve(__dirname, './package.json'), 'utf8'))

  for (let k in project) {
    project[ k ] = path.resolve(__dirname, `./project/${project[ k ]}`)
  }

  return project
}

exports.getProjectType = getProjectType

// 新建默认类型项目
const newDefaultProject = async data => {
  let { name, type, path: projectPath, version, isESNext, isSourcePath, author, c_version: cVersion, description = '', isESLint, from } = data

  const types = getProjectType()

  const projectTypePath = types[ type ]

  fs.ensureDirSync(projectPath)

  // package.json
  let packageJSON = {
    name,
    version,
    author,
    description,
    license: 'UNLICENSED',
    scripts: {
      'dev': 'lf dev',
      'build': 'lf build'
    }
  }

  // legoflow.json
  let legoflowJSON = {
    name,
    version: cVersion,
    type
  }

  typeof isESNext !== 'undefined' && (legoflowJSON['ES.Next'] = isESNext)

  let isNeedNpminstall = false
  let isNeedCreateDefalutFolder = true
  let isTsConfigJson = false
  let isJsEslint = false
  let isTsEslint = false

  if (type.indexOf('Vue') == 0) {
    isNeedCreateDefalutFolder = false
    isNeedNpminstall = from !== 'app'

    legoflowJSON.mode = 'webpack'

    legoflowJSON.webpack = {
      'sass.globalResources': [
        './src/style/var.scss'
      ]
    }

    legoflowJSON[ 'workflow.dev' ] = {}
    legoflowJSON[ 'workflow.build' ] = {}

    packageJSON.dependencies = {
      'axios': '^0.18.0',
      'vue': '^2.5.16',
      'vue-router': '^3.0.1',
      'vuex': '^3.0.1'
    }

    data.newProjectSuccessMessage = `➜ You can${!isSourcePath ? `${chalk.blue.bold(` **cd ${name}**`)} and` : ''} run ${chalk.blue.bold('**lf dev**')} to start workflow.dev`
  }

  switch (type) {
    case 'Mobile': {
      legoflowJSON.REM = true
      legoflowJSON.alias = {}
      legoflowJSON.global = {}
      break
    }
    case 'PC': {
      legoflowJSON.alias = {}
      legoflowJSON.global = {}
      break
    }
    case 'Vue.js': {
      isJsEslint = true

      legoflowJSON.entry = [ './src/main.js' ]

      break
    }
    case 'Vue.ts': {
      isTsConfigJson = true
      isTsEslint = true

      legoflowJSON.entry = [ './src/main.ts' ]

      const vueTsDependencies = {
        'vue-class-component': '^6.2.0',
        'vue-property-decorator': '^6.1.0'
      }

      packageJSON.dependencies = Object.assign(packageJSON.dependencies, vueTsDependencies)

      break
    }
  }

  if (typeof isESLint !== 'undefined') {
    legoflowJSON.ESLint = isESLint
  }

  // package.json
  fs.writeFileSync(path.resolve(projectPath, './package.json'), JSON.stringify(packageJSON, null, 2))

  const configFile = path.resolve(projectPath, './legoflow.yml')

  fs.writeFileSync(configFile, YAML.stringify(legoflowJSON, 2, 2))

  let formatYamlString = await formatYamlFile(configFile)

  formatYamlString = `# 参数说明: https://legoflow.com/wiki/config.html\n\n${formatYamlString}`

  // format YAML file
  fs.writeFileSync(configFile, formatYamlString)

  // cope type folder
  fs.copySync(projectTypePath, path.resolve(projectPath, './src'))

  // README
  fs.writeFileSync(path.resolve(projectPath, './README.md'), `# ${name}`, 'utf8')

  // create img folder
  const imgFolder = path.resolve(projectPath, './src/img')
  const imgBase64Folder = path.resolve(projectPath, './src/img/base64')
  const imgSliceFolder = path.resolve(projectPath, './src/img/slice')

  if (isNeedCreateDefalutFolder) {
    fs.mkdirSync(imgFolder)
    fs.mkdirSync(imgBase64Folder)
    fs.mkdirSync(imgSliceFolder)
  }

  // copy .gitignore .editorconfig
  const gitignoreFile = path.resolve(__dirname, './project/gitignore')
  const editorconfigFile = path.resolve(__dirname, './project/editorconfig')
  const tsconfigJsonFile = path.resolve(__dirname, './project/tsconfig.json')
  const jsEslintFile = path.resolve(__dirname, './project/js_eslint.js')
  const tsEslintFile = path.resolve(__dirname, './project/ts_eslint.js')
  const eslintIgnoreFile = path.resolve(__dirname, './project/eslintignore')

  fs.copySync(gitignoreFile, path.resolve(projectPath, './.gitignore'))
  fs.copySync(editorconfigFile, path.resolve(projectPath, './.editorconfig'))

  isTsConfigJson && fs.copySync(tsconfigJsonFile, path.resolve(projectPath, 'tsconfig.json'))
  isJsEslint && fs.copySync(jsEslintFile, path.resolve(projectPath, '.eslintrc.js'))
  isTsEslint && fs.copySync(tsEslintFile, path.resolve(projectPath, '.eslintrc.js'))

  ;(isJsEslint || isTsEslint) && (fs.copySync(eslintIgnoreFile, path.resolve(projectPath, '.eslintignore')))

  if (isNeedNpminstall && shell.cd(projectPath)) {
    console.log('installing local node_modules')

    shell.exec(`npm i`)
  }

  return data
}

// 新建自定义路径模板
const newGitProject = async data => {
  let { name, path: projectPath, gitSourcePath, isSourcePath } = data

  data.type = `git+${gitSourcePath}`

  if (path.extname(gitSourcePath) !== '.git') {
    console.error('Git Repo Error')

    process.exit(1)
  }

  const tmp = path.resolve(__dirname, `temp-${new Date().getTime()}`)

  fs.mkdirSync(tmp)

  const spinner = ora('downloading git repo').start()

  await new Promise(resolve => gitDownload(`direct:${gitSourcePath}`, tmp, { clone: true }, function (error) {
    spinner.stop()

    if (error) {
      console.error('下载 Git 模板错误', error)

      del.sync(tmp, { force: true })

      process.exit(1)
    } else {
      resolve()
    }
  }))

  fs.mkdirsSync(projectPath)

  shell.cd(projectPath)

  const templatePath = path.resolve(tmp, 'template')

  const yamlConfig = replaceInfo(data, fs.readFileSync(path.resolve(templatePath, 'legoflow.yml'), 'utf8'))
  const packageJson = replaceInfo(data, fs.readFileSync(path.resolve(templatePath, 'package.json'), 'utf8'))

  fs.writeFileSync(path.resolve(projectPath, 'legoflow.yml'), yamlConfig)
  fs.writeFileSync(path.resolve(projectPath, 'package.json'), packageJson)

  console.log(`➜ rewrite ${chalk.yellow('package.json')} & ${chalk.yellow('legoflow.yml')} success`)

  const otherFiles = await globby([ `${templatePath}/**/*`, `${templatePath}/**/.*`, `!${templatePath}/package.json`, `!${templatePath}/legoflow.yml` ])

  for (let f of otherFiles) {
    let distPath = path.resolve(projectPath, path.relative(templatePath, f))

    let basename = path.basename(f)

    fs.copySync(f, distPath)
  }

  // 重写 README
  const README = path.resolve(projectPath, 'README.md')

  if (fs.existsSync(README)) {
    fs.writeFileSync(README, replaceInfo(data, fs.readFileSync(README, 'utf8')))
  }

  console.log(`➜ copy ${chalk.yellow('remaining files')} success`)

  if (shell.exec(`npm i`).code !== 0) {
    return 'install dependencies error'
  }

  console.log('➜ install dependencies success')

  data.newProjectSuccessMessage = `➜ You can${!isSourcePath ? `${chalk.blue.bold(` **cd ${name}**`)} and` : ''} run ${chalk.blue.bold('**lf dev**')} to start workflow.dev`

  del.sync(tmp, { force: true })

  return data
}

// 新建项目
exports.new = async (data) => {
  let { name, path: projectPath, isSourcePath, type, typeSourcePath, gitSourcePath } = data

  if (!isSourcePath) {
    data.path = projectPath = path.resolve(projectPath, `./${name}`)
  }

  if (!isSourcePath && fs.existsSync(projectPath)) {
    return '项目已存在'
  }

  if (fs.existsSync(data.path) && glob.sync(`${data.path}/**/*`).length > 0) {
    return '路径存在其他文件'
  }

  if (gitSourcePath) {
    /* eslint-disable no-return-await */
    return await newGitProject(data)
  } else if (getProjectType()[ type ]) {
    /* eslint-disable no-return-await */
    return await newDefaultProject(data)
  } else {
    return '找不到该类型项目'
  }
}
