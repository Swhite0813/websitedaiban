@echo off
chcp 65001 >nul
echo ======================================
echo  待会·就办 - 后端部署工具
echo ======================================
echo.

cd api

echo [1/4] 正在安装依赖...
call npm install
if errorlevel 1 (
    echo 依赖安装失败！
    pause
    exit /b 1
)

echo.
echo [2/4] 检查环境变量...
if not exist .env (
    echo 创建环境变量文件...
    copy .env.example .env
    echo 请编辑 .env 文件，填入您的配置信息后重新运行
    notepad .env
    pause
    exit /b 1
)

echo.
echo [3/4] 正在部署到Vercel...
echo 如果您是第一次部署，请先运行: npx vercel login
echo.

choice /C YN /M "是否继续部署到Vercel"
if errorlevel 2 (
    echo 部署已取消
    pause
    exit /b 0
)

call npx vercel --prod
if errorlevel 1 (
    echo 部署失败！
    pause
    exit /b 1
)

echo.
echo [4/4] 部署完成！
echo.
echo ======================================
echo  下一步：
echo  1. 在Vercel Dashboard中配置环境变量
echo  2. 更新前端 js/api.js 中的API地址
echo  3. 重新部署前端到GitHub Pages
echo ======================================
echo.

pause
