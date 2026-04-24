// 3D 流水线场景
(function() {
    // 全局变量
    let scene, camera, renderer;
    let conveyorBelt, beltLinks = [], manipulators = [], part;
    let partState = 'MOVING_TO_FIRST'; // 零件状态
    let partPosition = { x: -12, y: 0.6, z: 0 };
    let currentManipulator = 0;
    let animationTime = 0;
    let hasEars = false, hasSmile = false, hasBody = false;
    
    // 零件组件
    let partBase, partLeftEar, partRightEar, partSmile, partBody;
    
    // 机械手组件引用
    let manipulatorComponents = [];
    
    // 初始化
    init();
    animate();
    
    function init() {
        // 创建场景
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        
        // 创建相机
        camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 1000);
        camera.position.set(0, 15, 20);
        camera.lookAt(0, 0, 0);
        
        // 创建渲染器
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(800, 600);
        renderer.shadowMap.enabled = true;
        document.getElementById('container').appendChild(renderer.domElement);
        
        // 添加灯光
        addLights();
        
        // 创建传送带（带链条节）
        createConveyorBeltWithLinks();
        
        // 创建3个机械手
        createManipulators();
        
        // 创建三角形零件
        createPart();
    }
    
    function addLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        // 方向光（主光源）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        // 点光源
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(0, 10, 5);
        scene.add(pointLight);
    }
    
    function createConveyorBeltWithLinks() {
        // 传送带底座框架
        const frameGeometry = new THREE.BoxGeometry(32, 0.3, 7);
        const frameMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x222222,
            shininess: 100
        });
        const beltFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        beltFrame.position.y = -0.6;
        beltFrame.receiveShadow = true;
        scene.add(beltFrame);
        
        // 创建链条节
        const linkWidth = 0.8;
        const linkHeight = 0.15;
        const linkDepth = 1.2;
        const gap = 0.2;
        const totalLinks = 40;
        
        const linkGeometry = new THREE.BoxGeometry(linkWidth, linkHeight, linkDepth);
        const linkMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x444444,
            shininess: 80
        });
        
        // 创建侧边链条
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < totalLinks; i++) {
                const link = new THREE.Mesh(linkGeometry, linkMaterial);
                // 初始位置
                const startX = -15 + i * (linkWidth + gap);
                link.position.set(startX, 0.08, side * 2.2);
                link.castShadow = true;
                link.receiveShadow = true;
                scene.add(link);
                
                beltLinks.push({
                    mesh: link,
                    startX: startX,
                    speed: 2.5,
                    offset: i * (linkWidth + gap)
                });
            }
        }
        
        // 传送带中间的连接板（模拟皮带表面）
        const surfaceGeometry = new THREE.BoxGeometry(30, 0.05, 2.5);
        const surfaceMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            shininess: 50
        });
        conveyorBelt = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
        conveyorBelt.position.y = 0;
        conveyorBelt.receiveShadow = true;
        scene.add(conveyorBelt);
        
        // 传送带支架
        const supportGeometry = new THREE.BoxGeometry(0.6, 2.5, 0.6);
        const supportMaterial = new THREE.MeshPhongMaterial({ color: 0x555555 });
        
        const supportPositions = [
            { x: -14, z: -3 },
            { x: -14, z: 3 },
            { x: 0, z: -3 },
            { x: 0, z: 3 },
            { x: 14, z: -3 },
            { x: 14, z: 3 }
        ];
        
        supportPositions.forEach(pos => {
            const support = new THREE.Mesh(supportGeometry, supportMaterial);
            support.position.set(pos.x, -2, pos.z);
            support.castShadow = true;
            support.receiveShadow = true;
            scene.add(support);
        });
    }
    
    function createManipulators() {
        // 机械手位置：离传送带更远（z轴方向）
        const manipulatorPositions = [
            { x: -6, z: -5 },
            { x: 0, z: -5 },
            { x: 6, z: -5 }
        ];
        
        manipulatorPositions.forEach((pos, index) => {
            const manipulator = createTwoClawManipulator(index);
            manipulator.position.set(pos.x, 0, pos.z);
            manipulators.push(manipulator);
            scene.add(manipulator);
            
            // 存储组件引用
            manipulatorComponents.push({
                mainArm: manipulator.children[0],
                forearm: manipulator.children[1],
                wrist: manipulator.children[2],
                gripper: manipulator.children[3],
                isProcessing: false,
                processTime: 0,
                originalPosition: { x: pos.x, z: pos.z }
            });
        });
    }
    
    function createTwoClawManipulator(index) {
        const manipulator = new THREE.Group();
        
        // 颜色方案
        const armColor = 0x3d5a80;    // 深蓝色
        const jointColor = 0x293241;  // 更深的蓝色
        const gripperColor = 0x98c1d9; // 浅蓝色
        
        // 主臂（竖直向上的支架）
        const mainArmGeometry = new THREE.BoxGeometry(0.8, 6, 0.8);
        const armMaterial = new THREE.MeshPhongMaterial({ 
            color: armColor,
            shininess: 100
        });
        const mainArm = new THREE.Mesh(mainArmGeometry, armMaterial);
        mainArm.position.y = 3;
        mainArm.castShadow = true;
        mainArm.receiveShadow = true;
        manipulator.add(mainArm);
        
        // 大臂（水平向前伸出）
        const forearmGeometry = new THREE.BoxGeometry(5, 0.6, 0.6);
        const forearmMaterial = new THREE.MeshPhongMaterial({ 
            color: jointColor,
            shininess: 100
        });
        const forearm = new THREE.Mesh(forearmGeometry, forearmMaterial);
        forearm.position.set(0, 6, 2.5);
        forearm.rotation.x = -0.2;
        forearm.castShadow = true;
        forearm.receiveShadow = true;
        manipulator.add(forearm);
        
        // 手腕关节
        const wristGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const wristMaterial = new THREE.MeshPhongMaterial({ 
            color: jointColor,
            shininess: 100
        });
        const wrist = new THREE.Mesh(wristGeometry, wristMaterial);
        wrist.position.set(0, 4.5, 4.8);
        wrist.castShadow = true;
        wrist.receiveShadow = true;
        manipulator.add(wrist);
        
        // 夹爪组件（两个钳子）
        const gripperGroup = new THREE.Group();
        
        // 夹爪连接座
        const gripperBaseGeometry = new THREE.BoxGeometry(1.2, 0.5, 0.8);
        const gripperMaterial = new THREE.MeshPhongMaterial({ 
            color: gripperColor,
            shininess: 80
        });
        const gripperBase = new THREE.Mesh(gripperBaseGeometry, gripperMaterial);
        gripperBase.position.y = 0;
        gripperGroup.add(gripperBase);
        
        // 左钳子
        const leftClawGeometry = new THREE.BoxGeometry(0.15, 1.8, 0.6);
        const clawMaterial = new THREE.MeshPhongMaterial({ 
            color: gripperColor,
            shininess: 100
        });
        const leftClaw = new THREE.Mesh(leftClawGeometry, clawMaterial);
        leftClaw.position.set(-0.45, -1, 0);
        leftClaw.castShadow = true;
        gripperGroup.add(leftClaw);
        
        // 右钳子
        const rightClaw = new THREE.Mesh(leftClawGeometry, clawMaterial);
        rightClaw.position.set(0.45, -1, 0);
        rightClaw.castShadow = true;
        gripperGroup.add(rightClaw);
        
        // 夹爪尖端（增加细节）
        const tipGeometry = new THREE.BoxGeometry(0.25, 0.3, 0.7);
        const leftTip = new THREE.Mesh(tipGeometry, clawMaterial);
        leftTip.position.set(-0.45, -1.85, 0);
        leftTip.castShadow = true;
        gripperGroup.add(leftTip);
        
        const rightTip = new THREE.Mesh(tipGeometry, clawMaterial);
        rightTip.position.set(0.45, -1.85, 0);
        rightTip.castShadow = true;
        gripperGroup.add(rightTip);
        
        // 设置夹爪初始位置
        gripperGroup.position.set(0, 3.5, 4.8);
        manipulator.add(gripperGroup);
        
        return manipulator;
    }
    
    function createPart() {
        part = new THREE.Group();
        
        // 三角形底座
        const triangleShape = new THREE.Shape();
        triangleShape.moveTo(0, 1);
        triangleShape.lineTo(-0.8, -0.5);
        triangleShape.lineTo(0.8, -0.5);
        triangleShape.lineTo(0, 1);
        
        const extrudeSettings = {
            steps: 1,
            depth: 0.3,
            bevelEnabled: true,
            bevelThickness: 0.05,
            bevelSize: 0.05,
            bevelSegments: 3
        };
        
        const triangleGeometry = new THREE.ExtrudeGeometry(triangleShape, extrudeSettings);
        const partMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff6600,
            shininess: 50
        });
        
        partBase = new THREE.Mesh(triangleGeometry, partMaterial);
        partBase.rotation.x = Math.PI / 2;
        partBase.castShadow = true;
        partBase.receiveShadow = true;
        part.add(partBase);
        
        // 耳朵（初始隐藏）
        createEars();
        
        // 笑脸（初始隐藏）
        createSmile();
        
        // 身体（初始隐藏，正方形）
        createSquareBody();
        
        // 设置初始位置
        part.position.set(partPosition.x, partPosition.y, partPosition.z);
        scene.add(part);
    }
    
    function createEars() {
        const earGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const earMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff8800,
            shininess: 50
        });
        
        // 左耳
        partLeftEar = new THREE.Mesh(earGeometry, earMaterial);
        partLeftEar.position.set(-0.6, 0.8, 0);
        partLeftEar.castShadow = true;
        part.add(partLeftEar);
        partLeftEar.visible = false;
        
        // 右耳
        partRightEar = new THREE.Mesh(earGeometry, earMaterial);
        partRightEar.position.set(0.6, 0.8, 0);
        partRightEar.castShadow = true;
        part.add(partRightEar);
        partRightEar.visible = false;
    }
    
    function createSmile() {
        partSmile = new THREE.Group();
        
        // 笑脸材质
        const smileMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            shininess: 100
        });
        
        // 左眼
        const eyeGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16);
        const leftEye = new THREE.Mesh(eyeGeometry, smileMaterial);
        leftEye.rotation.x = Math.PI / 2;
        leftEye.position.set(-0.25, 0.3, 0.18);
        leftEye.castShadow = true;
        partSmile.add(leftEye);
        
        // 右眼
        const rightEye = new THREE.Mesh(eyeGeometry, smileMaterial);
        rightEye.rotation.x = Math.PI / 2;
        rightEye.position.set(0.25, 0.3, 0.18);
        rightEye.castShadow = true;
        partSmile.add(rightEye);
        
        // 嘴巴（圆弧）
        const mouthCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.3, -0.1, 0),
            new THREE.Vector3(-0.15, -0.25, 0),
            new THREE.Vector3(0, -0.3, 0),
            new THREE.Vector3(0.15, -0.25, 0),
            new THREE.Vector3(0.3, -0.1, 0)
        ]);
        
        const mouthGeometry = new THREE.TubeGeometry(mouthCurve, 20, 0.04, 8, false);
        const mouthMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            shininess: 100
        });
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.z = 0.18;
        mouth.castShadow = true;
        partSmile.add(mouth);
        
        partSmile.position.z = 0;
        part.add(partSmile);
        partSmile.visible = false;
    }
    
    function createSquareBody() {
        // 更大的正方形身体
        const bodyGeometry = new THREE.BoxGeometry(2.2, 2.2, 0.4);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffaa00,
            shininess: 60
        });
        
        partBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        partBody.position.y = -1.8;
        partBody.castShadow = true;
        partBody.receiveShadow = true;
        part.add(partBody);
        partBody.visible = false;
    }
    
    function animate() {
        requestAnimationFrame(animate);
        animationTime += 0.016; // 约60fps
        
        updateBeltLinks();
        updatePartAnimation();
        updateManipulators();
        
        renderer.render(scene, camera);
    }
    
    function updateBeltLinks() {
        // 更新链条节位置，模拟滚动效果
        const beltLength = 32;
        const linkWidth = 0.8;
        const gap = 0.2;
        const speed = 2.5;
        
        beltLinks.forEach(linkData => {
            // 计算新位置
            let newX = linkData.mesh.position.x + speed * 0.016;
            
            // 循环：如果超出右端，重置到左端
            if (newX > 16) {
                newX = -16;
            }
            
            linkData.mesh.position.x = newX;
        });
    }
    
    function updatePartAnimation() {
        const beltSpeed = 2; // 传送带速度
        const manipulatorPositions = [-6, 0, 6];
        
        switch(partState) {
            case 'MOVING_TO_FIRST':
                // 移动到第一个机械手
                partPosition.x += beltSpeed * 0.016;
                if (partPosition.x >= manipulatorPositions[0]) {
                    partPosition.x = manipulatorPositions[0];
                    partState = 'AT_FIRST';
                    currentManipulator = 0;
                }
                break;
                
            case 'AT_FIRST':
            case 'AT_SECOND':
            case 'AT_THIRD':
                // 零件在机械手位置，等待抓取
                if (!manipulatorComponents[currentManipulator].isProcessing) {
                    manipulatorComponents[currentManipulator].isProcessing = true;
                    manipulatorComponents[currentManipulator].processTime = 0;
                    partState = 'BEING_LIFTED';
                }
                break;
                
            case 'BEING_LIFTED':
            case 'BEING_PROCESSED':
            case 'BEING_PLACED':
                // 零件被机械手控制，不在这里更新位置
                break;
                
            case 'MOVING_TO_SECOND':
                partPosition.x += beltSpeed * 0.016;
                if (partPosition.x >= manipulatorPositions[1]) {
                    partPosition.x = manipulatorPositions[1];
                    partState = 'AT_SECOND';
                    currentManipulator = 1;
                }
                break;
                
            case 'MOVING_TO_THIRD':
                partPosition.x += beltSpeed * 0.016;
                if (partPosition.x >= manipulatorPositions[2]) {
                    partPosition.x = manipulatorPositions[2];
                    partState = 'AT_THIRD';
                    currentManipulator = 2;
                }
                break;
                
            case 'MOVING_TO_EXIT':
                partPosition.x += beltSpeed * 0.016;
                if (partPosition.x > 15) {
                    // 重置到起点，循环动画
                    partPosition.x = -12;
                    partState = 'MOVING_TO_FIRST';
                    // 重置零件状态
                    hasEars = hasSmile = hasBody = false;
                    partLeftEar.visible = partRightEar.visible = false;
                    partSmile.visible = false;
                    partBody.visible = false;
                }
                break;
        }
        
        // 更新零件位置（除非正在被抓取）
        if (partState !== 'BEING_LIFTED' && partState !== 'BEING_PROCESSED' && partState !== 'BEING_PLACED') {
            part.position.set(partPosition.x, partPosition.y, partPosition.z);
        }
    }
    
    function updateManipulators() {
        manipulatorComponents.forEach((comp, index) => {
            if (comp.isProcessing) {
                comp.processTime += 0.016;
                
                // 动画阶段配置
                const moveToPartTime = 0.8;      // 移动到零件位置
                const grabTime = 0.4;             // 夹紧
                const liftTime = 0.3;              // 抬起
                const processTime = 1.5;           // 加工
                const lowerTime = 0.3;             // 放下
                const releaseTime = 0.4;           // 松开
                const returnTime = 0.8;            // 返回原位
                
                const totalTime = moveToPartTime + grabTime + liftTime + processTime + lowerTime + releaseTime + returnTime;
                
                let elapsed = comp.processTime;
                
                // 1. 移动到零件位置
                if (elapsed < moveToPartTime) {
                    const progress = elapsed / moveToPartTime;
                    moveGripperToPart(comp, index, progress);
                }
                // 2. 夹紧零件
                else if (elapsed < moveToPartTime + grabTime) {
                    const progress = (elapsed - moveToPartTime) / grabTime;
                    closeGripper(comp, progress);
                }
                // 3. 抬起零件
                else if (elapsed < moveToPartTime + grabTime + liftTime) {
                    const progress = (elapsed - moveToPartTime - grabTime) / liftTime;
                    liftPart(comp, index, progress);
                    if (partState === 'BEING_LIFTED' && progress > 0.5) {
                        partState = 'BEING_PROCESSED';
                    }
                }
                // 4. 加工零件
                else if (elapsed < moveToPartTime + grabTime + liftTime + processTime) {
                    const progress = (elapsed - moveToPartTime - grabTime - liftTime) / processTime;
                    processPart(comp, index, progress);
                    if (progress > 0.3) {
                        applyModification(index);
                    }
                }
                // 5. 放下零件
                else if (elapsed < moveToPartTime + grabTime + liftTime + processTime + lowerTime) {
                    const progress = (elapsed - moveToPartTime - grabTime - liftTime - processTime) / lowerTime;
                    lowerPart(comp, index, progress);
                    if (partState === 'BEING_PROCESSED' && progress > 0.5) {
                        partState = 'BEING_PLACED';
                    }
                }
                // 6. 松开夹爪
                else if (elapsed < moveToPartTime + grabTime + liftTime + processTime + lowerTime + releaseTime) {
                    const progress = (elapsed - moveToPartTime - grabTime - liftTime - processTime - lowerTime) / releaseTime;
                    openGripper(comp, progress);
                }
                // 7. 返回原位
                else if (elapsed < totalTime) {
                    const progress = (elapsed - moveToPartTime - grabTime - liftTime - processTime - lowerTime - releaseTime) / returnTime;
                    moveGripperBack(comp, index, progress);
                }
                // 完成
                else {
                    comp.isProcessing = false;
                    // 确保零件回到传送带
                    part.position.set(partPosition.x, partPosition.y, partPosition.z);
                    // 更新状态
                    if (index === 0) {
                        partState = 'MOVING_TO_SECOND';
                    } else if (index === 1) {
                        partState = 'MOVING_TO_THIRD';
                    } else {
                        partState = 'MOVING_TO_EXIT';
                    }
                }
            }
        });
    }
    
    function moveGripperToPart(comp, index, progress) {
        const gripper = comp.gripper;
        
        // 从初始位置移动到传送带上方的零件位置
        const startX = 0;
        const startY = 3.5;
        const startZ = 4.8;
        
        // 目标位置：零件上方
        const targetX = 0;
        const targetY = 1.5;
        const targetZ = 9.8;  // 向前移动到传送带位置
        
        // 使用平滑移动
        const easeProgress = easeInOutQuad(progress);
        
        gripper.position.x = startX + (targetX - startX) * easeProgress;
        gripper.position.y = startY + (targetY - startY) * easeProgress;
        gripper.position.z = startZ + (targetZ - startZ) * easeProgress;
    }
    
    function closeGripper(comp, progress) {
        const gripper = comp.gripper;
        const easeProgress = easeInOutQuad(progress);
        
        // 左钳子向右移动
        gripper.children[1].position.x = -0.45 + easeProgress * 0.3;
        // 右钳子向左移动
        gripper.children[2].position.x = 0.45 - easeProgress * 0.3;
        // 尖端也跟随移动
        gripper.children[3].position.x = -0.45 + easeProgress * 0.3;
        gripper.children[4].position.x = 0.45 - easeProgress * 0.3;
    }
    
    function liftPart(comp, index, progress) {
        const gripper = comp.gripper;
        const easeProgress = easeInOutQuad(progress);
        
        // 向上移动
        gripper.position.y = 1.5 - easeProgress * 2;
        
        // 零件跟随夹爪移动
        const manipulatorWorldPos = new THREE.Vector3();
        manipulators[index].getWorldPosition(manipulatorWorldPos);
        
        part.position.set(
            manipulatorWorldPos.x,
            partPosition.y + (1 - easeProgress) * 2,
            partPosition.z
        );
    }
    
    function processPart(comp, index, progress) {
        const gripper = comp.gripper;
        const easeProgress = easeInOutQuad(progress);
        
        // 轻微晃动模拟加工
        gripper.position.y = 1.5 + Math.sin(progress * Math.PI * 4) * 0.1;
        
        // 零件跟随
        const manipulatorWorldPos = new THREE.Vector3();
        manipulators[index].getWorldPosition(manipulatorWorldPos);
        
        part.position.set(
            manipulatorWorldPos.x,
            partPosition.y + Math.sin(progress * Math.PI * 4) * 0.1,
            partPosition.z
        );
    }
    
    function lowerPart(comp, index, progress) {
        const gripper = comp.gripper;
        const easeProgress = easeInOutQuad(progress);
        
        // 向下移动回到传送带
        gripper.position.y = 1.5 + easeProgress * 0;
        
        // 零件跟随
        const manipulatorWorldPos = new THREE.Vector3();
        manipulators[index].getWorldPosition(manipulatorWorldPos);
        
        part.position.set(
            manipulatorWorldPos.x,
            partPosition.y + easeProgress * 0,
            partPosition.z
        );
    }
    
    function openGripper(comp, progress) {
        const gripper = comp.gripper;
        const easeProgress = easeInOutQuad(progress);
        
        // 左钳子向左移动
        gripper.children[1].position.x = -0.15 - easeProgress * 0.3;
        // 右钳子向右移动
        gripper.children[2].position.x = 0.15 + easeProgress * 0.3;
        // 尖端也跟随移动
        gripper.children[3].position.x = -0.15 - easeProgress * 0.3;
        gripper.children[4].position.x = 0.15 + easeProgress * 0.3;
    }
    
    function moveGripperBack(comp, index, progress) {
        const gripper = comp.gripper;
        
        const startX = 0;
        const startY = 1.5;
        const startZ = 9.8;
        
        const targetX = 0;
        const targetY = 3.5;
        const targetZ = 4.8;
        
        const easeProgress = easeInOutQuad(progress);
        
        gripper.position.x = startX + (targetX - startX) * easeProgress;
        gripper.position.y = startY + (targetY - startY) * easeProgress;
        gripper.position.z = startZ + (targetZ - startZ) * easeProgress;
    }
    
    // 缓动函数
    function easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
    
    function applyModification(manipulatorIndex) {
        switch(manipulatorIndex) {
            case 0:
                // 第一个机械手：添加耳朵
                if (!hasEars) {
                    hasEars = true;
                    partLeftEar.visible = true;
                    partRightEar.visible = true;
                }
                break;
                
            case 1:
                // 第二个机械手：刻笑脸
                if (!hasSmile) {
                    hasSmile = true;
                    partSmile.visible = true;
                }
                break;
                
            case 2:
                // 第三个机械手：添加正方形身体（更大）
                if (!hasBody) {
                    hasBody = true;
                    partBody.visible = true;
                }
                break;
        }
    }
    
})();
