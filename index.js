'use strict';

const glob = require('glob');
const path = require('path');
const fs = require('fs-extra');
const config = require('legoflow-config');
const YAML = require('yamljs');
const shell = require('shelljs');
const formatYamlFile = require('format-yaml');

const getDefalutProjectType = ( ) => {
    const { project } = JSON.parse( fs.readFileSync( path.resolve( __dirname, './package.json' ), 'utf8' ) );

    for ( let k in project ) {
        project[ k ] = path.resolve( __dirname, `./project/${ project[ k ] }` );
    }

    return project;
}

const getCustomProjectType = ( ) => {
    const customProjectPath = config.get( 'customProjectPath' ) || '';

    let customProject = { };

    if ( customProjectPath && fs.existsSync( customProjectPath ) ) {
        const customProjectFolder = fs.readdirSync( customProjectPath ).filter( ( n ) => fs.statSync( path.resolve( customProjectPath, n ) ).isDirectory( ) )

        customProjectFolder.forEach( ( item ) => {
            customProject[ item ] = path.resolve( customProjectPath, item );
        } )
    }

    return customProject;
}

const getProjectType = ( ) => {
    return Object.assign( getDefalutProjectType( ), getCustomProjectType( ) );
}

exports.getProjectType = getProjectType;

const newDefaultProject = async ( data ) => {
    let { name, type, path: projectPath, version, isESNext, isSourcePath, author, c_version, description = '', isESLint } = data;

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
            legoflowJSON.externals = { vue: 'Vue' };
            legoflowJSON.alias = {
                'var.scss': './src/sass/_var.scss',
                '@': './src/js',
            }
            legoflowJSON[ 'workflow.dev' ] = { };
            legoflowJSON[ 'workflow.dev' ][ 'hot.reload' ] = true;
		    break;
        }
        case 'Vue.ts': {
            isNeedCreateDefalutFolder = false;
            isNeedNpminstall = true;

            legoflowJSON.includeModules = [ './node_modules' ];

            legoflowJSON.alias = {
                'var.scss': './src/sass/_var.scss',
                '@': './src',
            }

            legoflowJSON.ESLint = true;

            legoflowJSON.mode = 'webpack';

            legoflowJSON.entry = [ './src/main.ts' ];

            legoflowJSON[ 'workflow.dev' ] = { };
            legoflowJSON[ 'workflow.dev' ][ 'hot.reload' ] = true;

            legoflowJSON[ 'workflow.build' ] = { };
            legoflowJSON[ 'workflow.build' ][ 'bundle.limitResourcesSize' ] = 5;

            packageJSON.dependencies = {
                "axios": "^0.18.0",
                "vue": "^2.5.16",
                "vue-class-component": "^6.2.0",
                "vue-property-decorator": "^6.1.0",
                "vue-router": "^3.0.1",
                "vuex": "^3.0.1"
            }

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

    fs.copySync( gitignoreFile, path.resolve( projectPath, './.gitignore' ) );
    fs.copySync( editorconfigFile, path.resolve( projectPath, './.editorconfig' ) );

    if ( isNeedNpminstall && shell.cd( projectPath ) ) {
        console.log( 'installing local node_modules' );

        shell.exec( `npm i` );
    }

    return data;
}

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

    const replaceInfo = ( str ) => {
        return str.replace( /\[name\]/g, name )
                    .replace( /\[version\]/g, version )
                    .replace( /\[author\]/g, author )
                    .replace( /\[c_version\]/g, c_version )
                    .replace( /\[type\]/g, type )
                    .replace( /\[ESNext\]/g, isESNext )
    }

    const yamlConfig = replaceInfo( fs.readFileSync( yamlConfigPath, 'utf8' ) );
    const packageJson = replaceInfo( fs.readFileSync( packageJsonPath, 'utf8' ) );

    fs.ensureDirSync( projectPath );

    fs.writeFileSync( path.resolve( projectPath, 'legoflow.yml' ), yamlConfig );
    fs.writeFileSync( path.resolve( projectPath, 'package.json' ), packageJson );

    // copy src folder
    const srcPath = path.resolve( projectTypePath, 'src' );

    fs.existsSync( srcPath ) && fs.copySync( srcPath, path.resolve( projectPath, 'src' ) );

    // copy shell folder
    const shellPath = path.resolve( projectTypePath, 'shell' );

    fs.existsSync( shellPath ) && fs.copySync( srcPath, path.resolve( shellPath, 'shell' ) );

    return data;
}

exports.new = async ( data ) => {
    let { name, path: projectPath, isSourcePath, type } = data;

    if ( !isSourcePath ) {
        data.path = projectPath = path.resolve( projectPath, `./${ name }` );
    }

    if ( !isSourcePath && fs.existsSync( projectPath ) ) {
        return '项目已存在';
    }

    if ( fs.existsSync( data.path ) && glob.sync( `${ data.path }/**/*` ).length > 0 ) {
        return '路径存在其他文件';
    }

    if ( getCustomProjectType( )[ type ] ) {
        return await newCustomProject( data );
    }
    else if ( getDefalutProjectType( )[ type ] ) {
        return await newDefaultProject( data );
    }
    else {
        return '找不到该类型项目';
    }
}
