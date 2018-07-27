'use strict';

const chalk = require('chalk');
const globby = require('globby');
const glob = require('glob');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const legoflowConfig = require('legoflow-config');
const YAML = require('yamljs');
const shell = require('shelljs');
const formatYamlFile = require('format-yaml');

const replaceInfo = ( { name, version, c_version, author, isESNext, type }, str ) => {
    return str
                // 替换 项目名称
                .replace( /\[name\]/g, name )
                // 替换 项目版本号
                .replace( /\[version\]/g, version )
                // 替换 开发者用户
                .replace( /\[author\]/g, author )
                // 替换 lf 版本
                .replace( /\[c_version\]/g, c_version )
                // 替换 项目类型
                .replace( /\[type\]/g, type )
                // 替换 是否使用 ESNext
                .replace( /\[ESNext\]/g, isESNext )
}

// 获取默认项目类型模板
const getDefalutProjectType = ( ) => {
    const { project } = JSON.parse( fs.readFileSync( path.resolve( __dirname, './package.json' ), 'utf8' ) );

    for ( let k in project ) {
        project[ k ] = path.resolve( __dirname, `./project/${ project[ k ] }` );
    }

    return project;
}

// 获取本地自定义项目模板
const getCustomProjectType = ( ) => {
    const customProjectPath = legoflowConfig.get( 'customProjectPath' ) || '';

    let customProject = { };

    if ( customProjectPath && fs.existsSync( customProjectPath ) ) {
        const customProjectFolder = fs.readdirSync( customProjectPath ).filter( ( n ) => fs.statSync( path.resolve( customProjectPath, n ) ).isDirectory( ) )

        customProjectFolder.forEach( ( item ) => {
            customProject[ item ] = path.resolve( customProjectPath, item );
        } )
    }

    return customProject;
}

// 获取项目模板
const getProjectType = async ( ) => {
    const projectTypes = Object.assign( getDefalutProjectType( ), getCustomProjectType( ) );

    if ( !legoflowConfig.get('loadNPMLegoFlowTemplate') ) {
        return projectTypes;
    }

    const { data } = await axios('https://npm.taobao.org/browse/keyword/legoflow-template-?type=json');

    const npmTemplate = [ ];

    if ( data && data.packages ) {
        data.packages.forEach( ( item ) => {
            projectTypes[ item.name ] = `@npm@`;
        } )
    }

    return projectTypes;
}

exports.getProjectType = getProjectType;

// 新建默认类型项目
const newDefaultProject = async ( data ) => {
    let { name, type, path: projectPath, version, isESNext, isSourcePath, author, c_version, description = '', isESLint, from } = data;

    const types = getDefalutProjectType( );

    const projectTypePath = types[ type ];

    fs.ensureDirSync( projectPath );

    // package.json
    let packageJSON = {
        name,
        version,
        author,
        description,
    };

    // legoflow.json
    let legoflowJSON = {
        name,
        version: c_version,
        type,
        REM: false,
        'ES.Next': isESNext || true,
        ESLint: false,
        alias: { },
    };

    let isNeedNpminstall = false;
    let isNeedCreateDefalutFolder = true;
    let isTsConfigJson = false;

    if ( type.indexOf( 'Vue' ) == 0 ) {
        isNeedCreateDefalutFolder = false;
        isNeedNpminstall = from !=='app';

        legoflowJSON.ESLint = false;

        legoflowJSON.includeModules = [ './node_modules' ];

        legoflowJSON.alias = {
            '@': './src'
        }

        legoflowJSON.mode = 'webpack';

        legoflowJSON.webpack = {
            VueChunkStyle: false,
            'sass.globalResources': [
                './src/style/var.scss'
            ]
        }

        legoflowJSON[ 'workflow.dev' ] = { };
        legoflowJSON[ 'workflow.dev' ][ 'hot.reload' ] = true;

        legoflowJSON[ 'workflow.build' ] = { };
        legoflowJSON[ 'workflow.build' ][ 'cache' ] = 'hash';
        legoflowJSON[ 'workflow.build' ][ 'bundle.limitResourcesSize' ] = 5;

        packageJSON.dependencies = {
            "axios": "^0.18.0",
            "vue": "^2.5.16",
            "vue-router": "^3.0.1",
            "vuex": "^3.0.1"
        }

        data.newProjectSuccessMessage = `➜ You can${ !isSourcePath ? `${ chalk.blue.bold( ` **cd ${ name }**` ) } and` : '' } run ${ chalk.blue.bold( '**lf dev**' ) } to start workflow.dev`;
    }

    switch ( type ) {
		case 'Mobile': {
            legoflowJSON.REM = true;
            legoflowJSON.alias = { $: './src/assets/zepto.min.js', zepto: './src/assets/zepto.min.js' };
			legoflowJSON.global = { $: 'zepto', zepto: 'zepto', };
			break;
        }
		case 'PC': {
            legoflowJSON.alias = { $: './src/assets/jquery.min.js', jquery: './src/assets/jquery.min.js', jQuery: './src/assets/jquery.min.js', };
			legoflowJSON.global = { $: 'jquery', jquery: 'jquery', jQuery: 'jquery', };
			break;
        }
		case 'Vue.js': {
            legoflowJSON.entry = [ './src/main.js' ];

		    break;
        }
        case 'Vue.ts': {
            isTsConfigJson = true;

            legoflowJSON.ESLint = true;

            legoflowJSON.entry = [ './src/main.ts' ];

            const vueTsDependencies = {
                "vue-class-component": "^6.2.0",
                "vue-property-decorator": "^6.1.0",
            }

            packageJSON.dependencies = Object.assign( packageJSON.dependencies, vueTsDependencies );

		    break;
        }
    }

    if ( typeof isESLint !== 'undefined' ) {
        legoflowJSON.ESLint = isESLint;
    }

    // package.json
    fs.writeFileSync( path.resolve( projectPath, './package.json' ), JSON.stringify( packageJSON, null, 2 ) );

    const configFile = path.resolve( projectPath, './legoflow.yml' );

    fs.writeFileSync( configFile, YAML.stringify( legoflowJSON, 2, 2 ) );

    let formatYamlString = await formatYamlFile( configFile );

    formatYamlString = `# 参数说明: https://legoflow.com/wiki/config.html\n\n${ formatYamlString }`;

    // format YAML file
    fs.writeFileSync( configFile, formatYamlString );

    // cope type folder
    fs.copySync( projectTypePath, path.resolve( projectPath, './src' ) );

    // README
    fs.writeFileSync( path.resolve( projectPath, './README.md' ), `# ${ name }`, 'utf8' );

    // create img folder
    const imgFolder = path.resolve( projectPath, './src/img' );
    const imgBase64Folder = path.resolve( projectPath, './src/img/base64' );
    const imgSliceFolder = path.resolve( projectPath, './src/img/slice' );

    if ( isNeedCreateDefalutFolder ) {
        fs.mkdirSync( imgFolder );
        fs.mkdirSync( imgBase64Folder );
        fs.mkdirSync( imgSliceFolder );
    }

    // copy .gitignore .editorconfig
    const gitignoreFile = path.resolve( __dirname, './project/gitignore' );
    const editorconfigFile = path.resolve( __dirname, './project/editorconfig' );
    const tsconfigJsonFile = path.resolve( __dirname, './project/tsconfig.json' );

    fs.copySync( gitignoreFile, path.resolve( projectPath, './.gitignore' ) );
    fs.copySync( editorconfigFile, path.resolve( projectPath, './.editorconfig' ) );

    isTsConfigJson && fs.copySync( tsconfigJsonFile, path.resolve( projectPath, 'tsconfig.json' ) );

    if ( isNeedNpminstall && shell.cd( projectPath ) ) {
        console.log( 'installing local node_modules' );

        shell.exec( `npm i` );
    }

    return data;
}

// 新建自定义路径模板
const newCustomProject = async ( data ) => {
    let { name, type, path: projectPath, version, isESNext, isSourcePath, author, c_version } = data;

    const types = getCustomProjectType( );

    const projectTypePath = types[ type ];

    const yamlConfigPath = path.resolve( projectTypePath, 'legoflow.yml' );
    const packageJsonPath = path.resolve( projectTypePath, 'package.json' );

    if ( !fs.existsSync( yamlConfigPath ) ) {
        return '该项目类型缺少配置模板文件';
    }

    if ( !fs.existsSync( packageJsonPath ) ) {
        return '该项目类型缺少模板 package.json';
    }

    const yamlConfig = replaceInfo( data, fs.readFileSync( yamlConfigPath, 'utf8' ) );
    const packageJson = replaceInfo( data, fs.readFileSync( packageJsonPath, 'utf8' ) );

    fs.ensureDirSync( projectPath );

    fs.writeFileSync( path.resolve( projectPath, 'legoflow.yml' ), yamlConfig );
    fs.writeFileSync( path.resolve( projectPath, 'package.json' ), packageJson );

    // copy src folder
    const srcPath = path.resolve( projectTypePath, 'src' );

    fs.existsSync( srcPath ) && fs.copySync( srcPath, path.resolve( projectPath, 'src' ) );

    // copy shell folder
    const shellPath = path.resolve( projectTypePath, 'shell' );

    fs.existsSync( shellPath ) && fs.copySync( srcPath, path.resolve( shellPath, 'shell' ) );

    const README = path.resolve( projectPath, 'README.md' );

    if ( fs.existsSync( README ) ) {
        fs.writeFileSync( README, replaceInfo( data, fs.readFileSync( README, 'utf8' ) ) );
    }

    return data;
}

// 新建 npm 模板
const newNpmProject = async ( data ) => {
    let { name, type, path: projectPath, version, isESNext, isSourcePath, author, c_version } = data;

    fs.mkdirsSync( projectPath );

    shell.cd( projectPath );

    const packageJsonPath = path.resolve( projectPath, 'package.json' );
    const legoflowConfigPath = path.resolve( projectPath, 'legoflow.yml' );

    fs.writeFileSync( packageJsonPath, `{"name":"${ name }"}` );

    if ( shell.exec( `npm i ${ type } --save-dev` ).code !== 0 ) {
        return 'install NPM template error';
    }

    console.log( '➜ install template success' );

    // 重写配置
    const templatePath = path.resolve( projectPath, `./node_modules/${ type }/template` );

    const yamlConfig = replaceInfo( data, fs.readFileSync( path.resolve( templatePath, 'legoflow.yml' ), 'utf8' ) );
    let packageJson = replaceInfo( data, fs.readFileSync( path.resolve( templatePath, 'package.json' ), 'utf8' ) );

    fs.writeFileSync( path.resolve( projectPath, 'legoflow.yml' ), yamlConfig );

    try {
        packageJson = JSON.parse( packageJson );

        packageJson.devDependencies = Object.assign( (JSON.parse( fs.readFileSync( packageJsonPath ) )).devDependencies, packageJson.devDependencies || { } );
    } catch ( error ) {
        print.error( error );
    }

    fs.writeFileSync( path.resolve( projectPath, 'package.json' ), JSON.stringify( packageJson, null, 2 ) );

    console.log( '➜ rewrite package.json & legoflow.yml success' );

    const otherFiles = await globby([ `${ templatePath }/**/*`, `!${ templatePath }/package.json`, `!${ templatePath }/legoflow.yml` ] );

    for ( let f of otherFiles ) {
        let distPath = path.resolve( projectPath, path.relative( templatePath, f ) );

        let basename = path.basename( f );

        if ( basename.indexOf('~~') === 0 ) {
            distPath = distPath.replace( basename, `.${ basename.substring( 2 ) }` )
        }

        fs.copySync( f, distPath );
    }

    // 重写 README
    const README = path.resolve( projectPath, 'README.md' );

    if ( fs.existsSync( README ) ) {
        fs.writeFileSync( README, replaceInfo( data, fs.readFileSync( README, 'utf8' ) ) );
    }

    console.log( '➜ copy other files success' );

    if ( shell.exec( `npm i` ).code !== 0 ) {
        return 'install dependencies error';
    }

    console.log( '➜ install dependencies success' );

    data.newProjectSuccessMessage = `➜ You can${ !isSourcePath ? `${ chalk.blue.bold( ` **cd ${ name }**` ) } and` : '' } run ${ chalk.blue.bold( '**lf dev**' ) } to start workflow.dev`;

    return data;
}


// 新建项目
exports.new = async ( data ) => {
    let { name, path: projectPath, isSourcePath, type, typeSourcePath } = data;

    if ( !isSourcePath ) {
        data.path = projectPath = path.resolve( projectPath, `./${ name }` );
    }

    if ( !isSourcePath && fs.existsSync( projectPath ) ) {
        return '项目已存在';
    }

    if ( fs.existsSync( data.path ) && glob.sync( `${ data.path }/**/*` ).length > 0 ) {
        return '路径存在其他文件';
    }

    if ( typeSourcePath === '@npm@' ) {
        return await newNpmProject( data );
    }
    else if ( getCustomProjectType( )[ type ] ) {
        return await newCustomProject( data );
    }
    else if ( getDefalutProjectType( )[ type ] ) {
        return await newDefaultProject( data );
    }
    else {
        return '找不到该类型项目';
    }
}
