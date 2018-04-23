<h1 align="center"> Project </h1>

<p align="center">
    <a href="https://opensource.org/licenses/MIT">
        <img alt="Licence" src="https://img.shields.io/badge/license-MIT-green.svg" />
    </a>
    <a href="">
        <img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-green.svg" />
    </a>
</p>

<p align="center">
    项目模块
</p>

## 作用

创建 LegoFlow 项目脚手架模块

## 安装

```shell
npm i legoflow-project --save
```

## 使用

```js
const newProject = require('legoflow-project');

( async ( ) => {
    const result = await newProject( <config> );

    if ( typeof result === 'string' ) {
        console.error ( result );
    }
    else {
        console.log( 'success', result );
    }
} )
```

传入配置参数选项为:

| 名称 | 类型 | 默认值 | 备注 |
|-----|-----——|-----——|-----——|
| name | String | null | 项目名称 |
| type | String | null | 项目类型，可选值 `pc` / `mobile` / `vue` |
| version | String | null | 版本号 |
| path | String | null | 创建的绝对路径 |
| isESNext | Boolean | true | 是否对 JS 进行 ES.Next 语法编译 |
| isSourcePath | Boolean | false | 是否作为源路径，若为 `true`，则项目路径下直接作为项目路径，不单独创建以项目名称的文件夹 |

## 许可

[MIT](./LICENSE)
