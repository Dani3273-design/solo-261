// 3D 流水线场景
(function() {
    // 全局变量
    let scene, camera, renderer;
    let conveyorBelt, beltLinks = [], manipulators = [], part;
    let ceilingBridge; // 整体吊顶桥架
    let partState = 'MOVING_TO_FIRST'; // 零件状态
    let partPosition = { x: -12, y: 0.6, z: 0 };
    let currentManipulator = 0;
    let animationTime = 0;
    let hasEars = false, hasSmile = false, hasBody = false;
    
    // 统一的移动速度
    const MOVE_SPEED = 1.5; // 单位/秒
    
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
        
        // 创建整体吊顶桥架（连在一起，不是分开3块）
        createCeilingBridge();
        
        // 创建传送带（带连续链条节，完全覆盖）
        createConveyorBeltWithLinks();
        
        // 创建3个机械手（挂在整体桥架上）
        createCraneManipulators();
        
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
    
    function createCeilingBridge() {
        // 创建整体吊顶桥架（连在一起，不是分开3块）
        const bridgeGeometry = new THREE.BoxGeometry(25, 0.8, 8); // 长25，覆盖3个机械手位置
        const bridgeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2c3e50, // 深灰蓝色
            shininess: 100
        });
        
        ceilingBridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
        ceilingBridge.position.set(0, 11, 0); // 高度11
        ceilingBridge.castShadow = true;
        ceilingBridge.receiveShadow = true;
        scene.add(ceilingBridge);
        
        // 添加桥架支撑柱（左右两侧）
        const pillarGeometry = new THREE.BoxGeometry(0.8, 5, 0.8);
        const pillarMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x34495e,
            shininess: 80
        });
        
        // 左前柱
        const pillar1 = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar1.position.set(-12, 8, -3.5);
        pillar1.castShadow = true;
        scene.add(pillar1);
        
        // 左后柱
        const pillar2 = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar2.position.set(-12, 8, 3.5);
        pillar2.castShadow = true;
        scene.add(pillar2);
        
        // 右前柱
        const pillar3 = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar3.position.set(12, 8, -3.5);
        pillar3.castShadow = true;
        scene.add(pillar3);
        
        // 右后柱
        const pillar4 = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar4.position.set(12, 8, 3.5);
        pillar4.castShadow = true;
        scene.add(pillar4);
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
        
        // 创建链条节 - 间隙加大2倍（从0.02改为0.4）
        const linkWidth = 0.8;
        const linkHeight = 0.15;
        const linkDepth = 0.5; // 单个链条节的深度
        const gap = 0.4; // 间隙加大到0.4（是之前0.02的20倍，或者理解为合理的间隙）
        const totalLinks = 50;
        
        const linkGeometry = new THREE.BoxGeometry(linkWidth, linkHeight, linkDepth);
        const linkMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x444444,
            shininess: 80
        });
        
        // 创建多排链条节，完全覆盖传送带宽度
        // 传送带宽度是7，我们用多排链条节覆盖
        const rows = 5; // 5排链条节
        const rowSpacing = 1.2; // 每排之间的间距
        
        for (let row = 0; row < rows; row++) {
            const zPos = -2.4 + row * rowSpacing;
            
            for (let i = 0; i < totalLinks; i++) {
                const link = new THREE.Mesh(linkGeometry, linkMaterial);
                // 初始位置
                const startX = -20 + i * (linkWidth + gap);
                link.position.set(startX, 0.08, zPos);
                link.castShadow = true;
                link.receiveShadow = true;
                scene.add(link);
                
                beltLinks.push({
                    mesh: link,
                    startX: startX,
                    row: row
                });
            }
        }
        
        // 传送带中间的连接板（模拟皮带表面）
        const surfaceGeometry = new THREE.BoxGeometry(30, 0.05, 6);
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
    
    function createCraneManipulators() {
        // 机械手位置 - 在整体桥架下方，传送带正上方
        const manipulatorXPositions = [-6, 0, 6];
        
        manipulatorXPositions.forEach((posX, index) => {
            const manipulator = createCraneManipulator(index, posX);
            manipulator.position.set(posX, 0, 0); // 在传送带正上方
            manipulators.push(manipulator);
            scene.add(manipulator);
            
            // 存储组件引用
            manipulatorComponents.push({
                trolley: manipulator.children[0],
                cable: manipulator.children[1],
                gripper: manipulator.children[2],
                isProcessing: false,
                processTime: 0,
                originalX: posX
            });
        });
    }
    
    function createCraneManipulator(index, posX) {
        const manipulator = new THREE.Group();
        
        // 颜色方案
        const trolleyColor = 0xe74c3c;   // 红色（移动小车）
        const cableColor = 0x95a5a6;     // 灰色（钢缆）- 单条
        const gripperColor = 0xf39c12;   // 橙黄色（抓爪）
        
        // 1. 移动小车（在整体桥架下方移动）
        const trolleyGeometry = new THREE.BoxGeometry(2, 1, 3);
        const trolleyMaterial = new THREE.MeshPhongMaterial({ 
            color: trolleyColor,
            shininess: 80
        });
        const trolley = new THREE.Mesh(trolleyGeometry, trolleyMaterial);
        trolley.position.set(0, 10, 0); // 挂在桥架下方（桥架在y=11）
        trolley.castShadow = true;
        trolley.receiveShadow = true;
        manipulator.add(trolley);
        
        // 2. 单条钢缆（不是4条）
        // 粗一点的钢缆
        const cableGeometry = new THREE.CylinderGeometry(0.12, 0.12, 5, 12);
        const cableMaterial = new THREE.MeshPhongMaterial({ 
            color: cableColor,
            shininess: 100
        });
        const cable = new THREE.Mesh(cableGeometry, cableMaterial);
        cable.position.set(0, 7, 0); // 从小车底部(y=9.5)到初始抓爪位置(y=4.5)
        cable.castShadow = true;
        manipulator.add(cable);
        
        // 3. 抓爪组件（左右钳子，不是3个爪子）
        const gripperGroup = new THREE.Group();
        
        // 抓爪连接座
        const gripperBaseGeometry = new THREE.CylinderGeometry(0.5, 0.6, 0.4, 16);
        const gripperBaseMaterial = new THREE.MeshPhongMaterial({ 
            color: gripperColor,
            shininess: 80
        });
        const gripperBase = new THREE.Mesh(gripperBaseGeometry, gripperBaseMaterial);
        gripperBase.position.y = 0;
        gripperGroup.add(gripperBase);
        
        // 中心柱
        const centerPoleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
        const centerPole = new THREE.Mesh(centerPoleGeometry, cableMaterial);
        centerPole.position.y = -0.95;
        centerPole.castShadow = true;
        gripperGroup.add(centerPole);
        
        // 旋转关节（让钳子可以开合）
        const jointGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const jointMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2c3e50,
            shininess: 100
        });
        
        // 左关节
        const leftJoint = new THREE.Mesh(jointGeometry, jointMaterial);
        leftJoint.position.set(-0.35, -0.2, 0);
        leftJoint.castShadow = true;
        gripperGroup.add(leftJoint);
        
        // 右关节
        const rightJoint = new THREE.Mesh(jointGeometry, jointMaterial);
        rightJoint.position.set(0.35, -0.2, 0);
        rightJoint.castShadow = true;
        gripperGroup.add(rightJoint);
        
        // 左钳子
        const clawGeometry = new THREE.BoxGeometry(0.15, 1.8, 0.6);
        const clawMaterial = new THREE.MeshPhongMaterial({ 
            color: gripperColor,
            shininess: 80
        });
        
        // 左钳子
        const leftClaw = new THREE.Mesh(clawGeometry, clawMaterial);
        // 初始位置：钳子是张开的（物理合理：要抓住零件需要先张大）
        leftClaw.position.set(-0.7, -1.2, 0);
        // 钳子向外张开一定角度
        leftClaw.rotation.z = 0.3; // 向外倾斜
        leftClaw.castShadow = true;
        leftClaw.userData = {
            originalX: -0.7,
            originalRotationZ: 0.3,
            closedX: -0.25,
            closedRotationZ: -0.1
        };
        gripperGroup.add(leftClaw);
        
        // 右钳子
        const rightClaw = new THREE.Mesh(clawGeometry, clawMaterial);
        // 初始位置：钳子是张开的
        rightClaw.position.set(0.7, -1.2, 0);
        // 钳子向外张开一定角度
        rightClaw.rotation.z = -0.3; // 向外倾斜
        rightClaw.castShadow = true;
        rightClaw.userData = {
            originalX: 0.7,
            originalRotationZ: -0.3,
            closedX: 0.25,
            closedRotationZ: 0.1
        };
        gripperGroup.add(rightClaw);
        
        // 抓爪初始位置
        gripperGroup.position.set(0, 4.5, 0);
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
        
        // 身体（初始隐藏，正方形，横向平行传送带）
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
        // 正方形身体 - 横向平行传送带
        // 传送带沿X轴方向，所以正方形的边应该平行于X轴和Y轴（平面）
        // 我们需要创建一个扁平的正方形，横向（X轴方向）放置
        
        // 创建一个正方形，让它"横放"在传送带上
        // 注意：三角形零件的底座是在X-Y平面（rotation.x = Math.PI/2）
        // 所以正方形身体也应该在相同的平面
        
        // 更大的正方形，确保可见
        const bodySize = 2.0; // 边长
        const bodyThickness = 0.25; // 厚度
        
        // 使用ExtrudeGeometry创建正方形，然后旋转到正确方向
        const squareShape = new THREE.Shape();
        squareShape.moveTo(-bodySize/2, bodySize/2);
        squareShape.lineTo(bodySize/2, bodySize/2);
        squareShape.lineTo(bodySize/2, -bodySize/2);
        squareShape.lineTo(-bodySize/2, -bodySize/2);
        squareShape.lineTo(-bodySize/2, bodySize/2);
        
        const extrudeSettings = {
            steps: 1,
            depth: bodyThickness,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.03,
            bevelSegments: 2
        };
        
        const bodyGeometry = new THREE.ExtrudeGeometry(squareShape, extrudeSettings);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xcc8800, // 深一点的橙色，和三角形区分
            shininess: 60
        });
        
        partBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        // 旋转到和三角形零件相同的平面（X-Y平面）
        partBody.rotation.x = Math.PI / 2;
        // 位置调整：在三角形零件下方，确保可见
        partBody.position.y = -1.0; // 向上移动，让它更可见
        partBody.position.z = 0;
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
        // 使用与零件相同的移动速度
        const deltaX = MOVE_SPEED * 0.016;
        
        beltLinks.forEach(linkData => {
            // 计算新位置
            let newX = linkData.mesh.position.x + deltaX;
            
            // 循环：如果超出右端，重置到左端
            if (newX > 20) {
                newX = -20;
            }
            
            linkData.mesh.position.x = newX;
        });
    }
    
    function updatePartAnimation() {
        const manipulatorPositions = [-6, 0, 6];
        const deltaX = MOVE_SPEED * 0.016; // 每帧移动距离
        
        switch(partState) {
            case 'MOVING_TO_FIRST':
                // 移动到第一个机械手
                partPosition.x += deltaX;
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
                partPosition.x += deltaX;
                if (partPosition.x >= manipulatorPositions[1]) {
                    partPosition.x = manipulatorPositions[1];
                    partState = 'AT_SECOND';
                    currentManipulator = 1;
                }
                break;
                
            case 'MOVING_TO_THIRD':
                partPosition.x += deltaX;
                if (partPosition.x >= manipulatorPositions[2]) {
                    partPosition.x = manipulatorPositions[2];
                    partState = 'AT_THIRD';
                    currentManipulator = 2;
                }
                break;
                
            case 'MOVING_TO_EXIT':
                partPosition.x += deltaX;
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
                
                // 抓娃娃机风格的动画流程：
                // 1. 抓爪下降（钳子保持张开状态）
                // 2. 钳子合拢（抓住零件）
                // 3. 抓爪上升（带着零件）- 物理同步：零件和机械手一起上
                // 4. 加工（轻微晃动）
                // 5. 抓爪下降（带着零件）- 物理同步：一起下
                // 6. 钳子张开（松开零件）
                // 7. 抓爪上升回原位
                
                const lowerTime = 1.0;         // 下降时间
                const closeTime = 0.5;         // 合拢时间
                const liftTime = 0.8;          // 上升时间
                const processTime = 1.5;       // 加工时间
                const lowerAgainTime = 0.8;    // 再次下降时间
                const openTime = 0.5;          // 张开时间
                const returnTime = 0.8;        // 返回原位时间
                
                const totalTime = lowerTime + closeTime + liftTime + processTime + 
                                  lowerAgainTime + openTime + returnTime;
                
                let elapsed = comp.processTime;
                
                // 1. 抓爪下降（钳子保持张开）
                if (elapsed < lowerTime) {
                    const progress = elapsed / lowerTime;
                    lowerGripper(comp, index, progress);
                }
                // 2. 钳子合拢（抓住零件）
                else if (elapsed < lowerTime + closeTime) {
                    const progress = (elapsed - lowerTime) / closeTime;
                    closeClaws(comp, index, progress);
                }
                // 3. 抓爪上升（带着零件）- 物理同步
                else if (elapsed < lowerTime + closeTime + liftTime) {
                    const progress = (elapsed - lowerTime - closeTime) / liftTime;
                    liftGripperWithPart(comp, index, progress);
                    if (progress > 0.3 && partState === 'BEING_LIFTED') {
                        partState = 'BEING_PROCESSED';
                    }
                }
                // 4. 加工
                else if (elapsed < lowerTime + closeTime + liftTime + processTime) {
                    const progress = (elapsed - lowerTime - closeTime - liftTime) / processTime;
                    processPartWithGripper(comp, index, progress);
                    if (progress > 0.3) {
                        applyModification(index);
                    }
                }
                // 5. 抓爪下降（带着零件）- 物理同步
                else if (elapsed < lowerTime + closeTime + liftTime + processTime + lowerAgainTime) {
                    const progress = (elapsed - lowerTime - closeTime - liftTime - processTime) / lowerAgainTime;
                    lowerGripperWithPart(comp, index, progress);
                    if (progress > 0.5 && partState === 'BEING_PROCESSED') {
                        partState = 'BEING_PLACED';
                    }
                }
                // 6. 钳子张开（松开零件）
                else if (elapsed < lowerTime + closeTime + liftTime + processTime + lowerAgainTime + openTime) {
                    const progress = (elapsed - lowerTime - closeTime - liftTime - processTime - lowerAgainTime) / openTime;
                    openClaws(comp, index, progress);
                }
                // 7. 抓爪上升回原位
                else if (elapsed < totalTime) {
                    const progress = (elapsed - lowerTime - closeTime - liftTime - processTime - lowerAgainTime - openTime) / returnTime;
                    returnGripperToOriginal(comp, index, progress);
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
    
    function lowerGripper(comp, index, progress) {
        const gripper = comp.gripper;
        const cable = comp.cable;
        const easeProgress = easeInOutQuad(progress);
        
        // 从初始高度4.5下降到接近传送带的高度1.2
        const startY = 4.5;
        const targetY = 1.2;
        
        gripper.position.y = startY + (targetY - startY) * easeProgress;
        
        // 同时更新钢缆
        updateCable(cable, gripper.position.y);
        
        // 注意：钳子保持张开状态（不需要改变）
    }
    
    function closeClaws(comp, index, progress) {
        const gripper = comp.gripper;
        const easeProgress = easeInOutQuad(progress);
        
        // 找到左右钳子
        // gripper.children[0] = 连接座
        // gripper.children[1] = 中心柱
        // gripper.children[2] = 左关节
        // gripper.children[3] = 右关节
        // gripper.children[4] = 左钳子
        // gripper.children[5] = 右钳子
        
        const leftClaw = gripper.children[4];
        const rightClaw = gripper.children[5];
        
        // 左钳子：从张开位置移动到合拢位置
        const leftUserData = leftClaw.userData;
        leftClaw.position.x = leftUserData.originalX + 
                              (leftUserData.closedX - leftUserData.originalX) * easeProgress;
        leftClaw.rotation.z = leftUserData.originalRotationZ + 
                              (leftUserData.closedRotationZ - leftUserData.originalRotationZ) * easeProgress;
        
        // 右钳子：从张开位置移动到合拢位置
        const rightUserData = rightClaw.userData;
        rightClaw.position.x = rightUserData.originalX + 
                               (rightUserData.closedX - rightUserData.originalX) * easeProgress;
        rightClaw.rotation.z = rightUserData.originalRotationZ + 
                               (rightUserData.closedRotationZ - rightUserData.originalRotationZ) * easeProgress;
    }
    
    function liftGripperWithPart(comp, index, progress) {
        const gripper = comp.gripper;
        const cable = comp.cable;
        const easeProgress = easeInOutQuad(progress);
        
        // 从1.2上升到4.0
        const startY = 1.2;
        const targetY = 4.0;
        
        gripper.position.y = startY + (targetY - startY) * easeProgress;
        
        // 更新钢缆
        updateCable(cable, gripper.position.y);
        
        // 物理同步：零件跟随抓爪一起上升
        // 零件位置 = 抓爪位置 - 偏移量
        const manipulatorWorldPos = new THREE.Vector3();
        manipulators[index].getWorldPosition(manipulatorWorldPos);
        
        // 计算抓爪的世界Y坐标
        const gripperWorldY = manipulatorWorldPos.y + gripper.position.y;
        
        // 零件应该在抓爪下方
        // 抓爪底部大约在 gripper.position.y - 1.8（因为钳子长度是1.8）
        // 零件顶部在 partPosition.y + 0.5（三角形高度约1，中心在0.6）
        // 所以偏移量应该让零件刚好被钳子抓住
        
        part.position.set(
            manipulatorWorldPos.x,
            partPosition.y + (targetY - startY) * easeProgress, // 一起上升
            partPosition.z
        );
    }
    
    function processPartWithGripper(comp, index, progress) {
        const gripper = comp.gripper;
        const cable = comp.cable;
        
        // 轻微晃动模拟加工
        const shakeAmount = 0.05;
        const shake = Math.sin(progress * Math.PI * 8) * shakeAmount;
        
        // 保持在4.0的高度，轻微晃动
        gripper.position.y = 4.0 + shake;
        
        // 更新钢缆
        updateCable(cable, gripper.position.y);
        
        // 物理同步：零件跟随晃动
        const manipulatorWorldPos = new THREE.Vector3();
        manipulators[index].getWorldPosition(manipulatorWorldPos);
        
        part.position.set(
            manipulatorWorldPos.x,
            partPosition.y + 2.8 + shake, // 保持上升后的高度 + 晃动
            partPosition.z
        );
    }
    
    function lowerGripperWithPart(comp, index, progress) {
        const gripper = comp.gripper;
        const cable = comp.cable;
        const easeProgress = easeInOutQuad(progress);
        
        // 从4.0下降到1.2
        const startY = 4.0;
        const targetY = 1.2;
        
        gripper.position.y = startY + (targetY - startY) * easeProgress;
        
        // 更新钢缆
        updateCable(cable, gripper.position.y);
        
        // 物理同步：零件跟随抓爪一起下降
        const manipulatorWorldPos = new THREE.Vector3();
        manipulators[index].getWorldPosition(manipulatorWorldPos);
        
        part.position.set(
            manipulatorWorldPos.x,
            partPosition.y + 2.8 * (1 - easeProgress), // 一起下降
            partPosition.z
        );
    }
    
    function openClaws(comp, index, progress) {
        const gripper = comp.gripper;
        const easeProgress = easeInOutQuad(progress);
        
        // 找到左右钳子
        const leftClaw = gripper.children[4];
        const rightClaw = gripper.children[5];
        
        // 左钳子：从合拢位置回到张开位置
        const leftUserData = leftClaw.userData;
        leftClaw.position.x = leftUserData.closedX + 
                              (leftUserData.originalX - leftUserData.closedX) * easeProgress;
        leftClaw.rotation.z = leftUserData.closedRotationZ + 
                              (leftUserData.originalRotationZ - leftUserData.closedRotationZ) * easeProgress;
        
        // 右钳子：从合拢位置回到张开位置
        const rightUserData = rightClaw.userData;
        rightClaw.position.x = rightUserData.closedX + 
                               (rightUserData.originalX - rightUserData.closedX) * easeProgress;
        rightClaw.rotation.z = rightUserData.closedRotationZ + 
                               (rightUserData.originalRotationZ - rightUserData.closedRotationZ) * easeProgress;
    }
    
    function returnGripperToOriginal(comp, index, progress) {
        const gripper = comp.gripper;
        const cable = comp.cable;
        const easeProgress = easeInOutQuad(progress);
        
        // 从1.2上升回到初始高度4.5
        const startY = 1.2;
        const targetY = 4.5;
        
        gripper.position.y = startY + (targetY - startY) * easeProgress;
        
        // 更新钢缆
        updateCable(cable, gripper.position.y);
    }
    
    function updateCable(cable, gripperY) {
        // 小车底部在Y=9.5
        const trolleyBottomY = 9.5;
        
        // 计算钢缆长度
        // 钢缆连接小车底部和抓爪顶部
        // 抓爪顶部大约在 gripperY + 0.2（连接座高度的一半）
        const cableLength = trolleyBottomY - (gripperY + 0.2);
        
        // 更新钢缆的缩放和位置
        // 原始钢缆长度是5
        cable.scale.y = cableLength / 5;
        
        // 钢缆中心在小车底部和抓爪顶部中间
        const centerY = (trolleyBottomY + (gripperY + 0.2)) / 2;
        cable.position.y = centerY;
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
                // 第三个机械手：添加正方形身体
                if (!hasBody) {
                    hasBody = true;
                    partBody.visible = true;
                }
                break;
        }
    }
    
})();
