// 3D 流水线场景
(function() {
    // 全局变量
    let scene, camera, renderer;
    let conveyorBelt, beltLinks = [], manipulators = [], part;
    let ceilingBridge;
    let partState = 'MOVING_TO_FIRST';
    let partPosition = { x: -12, y: 0.6, z: 0 };
    let currentManipulator = 0;
    let animationTime = 0;
    let hasEars = false, hasSmile = false, hasBody = false;
    
    // 统一的移动速度
    const MOVE_SPEED = 1.5;
    
    // 物理参数
    const GRIPPER_MIN_Y = 1.8; // 抓爪最低高度
    const TROLLEY_BOTTOM_Y = 9.5; // 小车底部Y坐标
    
    // 零件组件
    let partBase, partLeftEar, partRightEar, partSmile, partBody;
    
    // 机械手组件引用
    let manipulatorComponents = [];
    
    // 初始化
    init();
    animate();
    
    function init() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        
        camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 1000);
        camera.position.set(0, 15, 20);
        camera.lookAt(0, 0, 0);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(800, 600);
        renderer.shadowMap.enabled = true;
        document.getElementById('container').appendChild(renderer.domElement);
        
        addLights();
        createCeilingBridge();
        createConveyorBeltWithLinks();
        createCraneManipulators();
        createPart();
    }
    
    function addLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(0, 10, 5);
        scene.add(pointLight);
    }
    
    function createCeilingBridge() {
        // 整体吊顶桥架 - 连在一起
        const bridgeGeometry = new THREE.BoxGeometry(25, 0.8, 8);
        const bridgeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2c3e50,
            shininess: 100
        });
        
        ceilingBridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
        ceilingBridge.position.set(0, 11, 0);
        ceilingBridge.castShadow = true;
        ceilingBridge.receiveShadow = true;
        scene.add(ceilingBridge);
        
        // 支撑柱
        const pillarGeometry = new THREE.BoxGeometry(0.8, 5, 0.8);
        const pillarMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x34495e,
            shininess: 80
        });
        
        const pillarPositions = [
            { x: -12, z: -3.5 },
            { x: -12, z: 3.5 },
            { x: 12, z: -3.5 },
            { x: 12, z: 3.5 }
        ];
        
        pillarPositions.forEach(pos => {
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(pos.x, 8, pos.z);
            pillar.castShadow = true;
            scene.add(pillar);
        });
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
        
        // 链条节 - 关键修复：垂直于运动方向（Z轴）连在一起，无间隙
        // 每根链条节覆盖整个传送带宽度（Z轴方向）
        const linkWidth = 0.8; // X轴方向（运动方向）
        const linkHeight = 0.15; // Y轴方向
        const linkDepth = 6.0; // Z轴方向 - 覆盖整个宽度，垂直方向连在一起
        const gap = 0.02; // X轴方向间隙很小
        const totalLinks = 60;
        
        const linkGeometry = new THREE.BoxGeometry(linkWidth, linkHeight, linkDepth);
        const linkMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x444444,
            shininess: 80
        });
        
        // 只需要一排，因为每根链条节已经覆盖整个Z轴宽度
        for (let i = 0; i < totalLinks; i++) {
            const link = new THREE.Mesh(linkGeometry, linkMaterial);
            const startX = -25 + i * (linkWidth + gap);
            link.position.set(startX, 0.03, 0); // 向下移动避免穿透
            link.castShadow = true;
            link.receiveShadow = true;
            scene.add(link);
            
            beltLinks.push({ mesh: link, startX: startX });
        }
        
        // 传送带中间的连接板
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
        const manipulatorXPositions = [-6, 0, 6];
        
        manipulatorXPositions.forEach((posX, index) => {
            const manipulator = createSingleManipulator();
            manipulator.position.set(posX, 0, 0);
            manipulators.push(manipulator);
            scene.add(manipulator);
            
            // 存储组件引用
            manipulatorComponents.push({
                trolley: manipulator.children[0],
                cable: manipulator.children[1],
                gripper: manipulator.children[2],
                isProcessing: false,
                processTime: 0
            });
        });
    }
    
    function createSingleManipulator() {
        const manipulator = new THREE.Group();
        
        const trolleyColor = 0xe74c3c;
        const cableColor = 0x95a5a6;
        const gripperColor = 0xf39c12;
        
        // 1. 移动小车
        const trolleyGeometry = new THREE.BoxGeometry(2, 1, 3);
        const trolleyMaterial = new THREE.MeshPhongMaterial({ 
            color: trolleyColor,
            shininess: 80
        });
        const trolley = new THREE.Mesh(trolleyGeometry, trolleyMaterial);
        trolley.position.set(0, 10, 0); // 中心Y=10，底部Y=9.5
        trolley.castShadow = true;
        trolley.receiveShadow = true;
        manipulator.add(trolley);
        
        // 2. 单条钢缆
        const cableGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1, 12);
        const cableMaterial = new THREE.MeshPhongMaterial({ 
            color: cableColor,
            shininess: 100
        });
        const cable = new THREE.Mesh(cableGeometry, cableMaterial);
        cable.position.set(0, 7.1, 0); // 初始位置，会动态更新
        cable.castShadow = true;
        manipulator.add(cable);
        
        // 3. 抓爪组件
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
        
        // 左右钳子 - 关键修复：物理合理的张开和合拢
        const clawGeometry = new THREE.BoxGeometry(0.15, 1.4, 0.6);
        const clawMaterial = new THREE.MeshPhongMaterial({ 
            color: gripperColor,
            shininess: 80
        });
        
        // 左钳子 - 初始张开状态（要抓住先张大）
        const leftClaw = new THREE.Mesh(clawGeometry, clawMaterial);
        leftClaw.position.set(-0.9, -0.9, 0); // Y=-0.9：钳子顶部在Y=-0.9+0.7=-0.2，刚好连接到连接座底部
        leftClaw.rotation.z = 0.35; // 向外倾斜
        leftClaw.castShadow = true;
        leftClaw.userData = {
            originalX: -0.9,
            originalRotationZ: 0.35,
            closedX: -0.87, // 合拢位置：零件左边缘在-0.8，钳子宽度0.15，中心在-0.87时右边缘=-0.87+0.075=-0.795，刚好接触零件
            closedRotationZ: 0.05
        };
        gripperGroup.add(leftClaw);
        
        // 右钳子 - 初始张开状态
        const rightClaw = new THREE.Mesh(clawGeometry, clawMaterial);
        rightClaw.position.set(0.9, -0.9, 0); // Y=-0.9：钳子顶部在Y=-0.9+0.7=-0.2，刚好连接到连接座底部
        rightClaw.rotation.z = -0.35; // 向外倾斜
        rightClaw.castShadow = true;
        rightClaw.userData = {
            originalX: 0.9,
            originalRotationZ: -0.35,
            closedX: 0.87, // 合拢位置：零件右边缘在0.8，钳子宽度0.15，中心在0.87时左边缘=0.87-0.075=0.795，刚好接触零件
            closedRotationZ: -0.05
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
        
        // 耳朵
        createEars();
        
        // 笑脸
        createSmile();
        
        // 正方形身体
        createSquareBody();
        
        part.position.set(partPosition.x, partPosition.y, partPosition.z);
        scene.add(part);
    }
    
    function createEars() {
        const earGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const earMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff8800,
            shininess: 50
        });
        
        partLeftEar = new THREE.Mesh(earGeometry, earMaterial);
        partLeftEar.position.set(-0.6, 0.8, 0);
        partLeftEar.castShadow = true;
        part.add(partLeftEar);
        partLeftEar.visible = false;
        
        partRightEar = new THREE.Mesh(earGeometry, earMaterial);
        partRightEar.position.set(0.6, 0.8, 0);
        partRightEar.castShadow = true;
        part.add(partRightEar);
        partRightEar.visible = false;
    }
    
    function createSmile() {
        partSmile = new THREE.Group();
        
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
        
        // 嘴巴
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
        // 正方形身体 - 关键修复：
        // 1. 横向平行传送带
        // 2. 与三角零件间隙为0
        // 3. 在传送带之上
        // 4. 足够大，可见
        
        // 三角形零件分析：
        // - 三角形在X-Y平面创建，然后 rotation.x = Math.PI/2
        // - 旋转后，三角形在X-Z平面（水平）
        // - 挤出深度（0.3）沿-Y轴方向（向下）
        // - 零件中心Y=0.6
        // - 所以三角形从Y=0.6（顶部）到Y=0.3（底部）
        
        // 正方形应该：
        // - 同样在X-Z平面（rotation.x = Math.PI/2）
        // - 顶部Y=0.3（接触三角形底部，间隙为0）
        // - 底部Y=0.3 - 厚度（在链条节Y=0.03之上）
        
        const bodySize = 2.2; // 比三角形大，可见
        const bodyThickness = 0.25;
        
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
            color: 0xcc8800,
            shininess: 60
        });
        
        partBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        partBody.rotation.x = Math.PI / 2; // 与三角形同平面
        
        // 位置计算：
        // 三角形挤出方向是Z轴，rotation.x = Math.PI/2后变成Y轴
        // 三角形底部（本地Y=0）对应全局Y=0.6 + 0 = 0.6
        // 三角形顶部（本地Y=0.3）对应全局Y=0.6 + 0.3 = 0.9
        // 正方形需要顶部Y=0.6才能间隙为0
        // 正方形挤出深度0.25，旋转后顶部在本地Y=0.25
        // 所以：0.6 + partBody.position.y + 0.25 = 0.6
        // partBody.position.y = -0.25
        
        // 验证：
        // 正方形顶部Y = 0.6 + (-0.25) + 0.25 = 0.6（接触三角形底部，间隙为0）
        // 正方形底部Y = 0.6 + (-0.25) + 0 = 0.35（在链条节Y=0.03之上，不穿透）
        
        partBody.position.y = -0.25; // 间隙为0，在链条节之上
        partBody.position.z = 0;
        
        partBody.castShadow = true;
        partBody.receiveShadow = true;
        part.add(partBody);
        partBody.visible = false;
    }
    
    function animate() {
        requestAnimationFrame(animate);
        animationTime += 0.016;
        
        updateBeltLinks();
        updatePartAnimation();
        updateManipulators();
        
        // 关键修复：为所有机械手更新钢缆
        manipulatorComponents.forEach(comp => {
            updateCable(comp.cable, comp.gripper.position.y);
        });
        
        renderer.render(scene, camera);
    }
    
    function updateBeltLinks() {
        const deltaX = MOVE_SPEED * 0.016;
        
        beltLinks.forEach(linkData => {
            let newX = linkData.mesh.position.x + deltaX;
            if (newX > 20) {
                newX = -25;
            }
            linkData.mesh.position.x = newX;
        });
    }
    
    function updatePartAnimation() {
        const manipulatorPositions = [-6, 0, 6];
        const deltaX = MOVE_SPEED * 0.016;
        
        switch(partState) {
            case 'MOVING_TO_FIRST':
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
                if (!manipulatorComponents[currentManipulator].isProcessing) {
                    manipulatorComponents[currentManipulator].isProcessing = true;
                    manipulatorComponents[currentManipulator].processTime = 0;
                    partState = 'BEING_LIFTED';
                }
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
                    partPosition.x = -12;
                    partState = 'MOVING_TO_FIRST';
                    hasEars = hasSmile = hasBody = false;
                    partLeftEar.visible = partRightEar.visible = false;
                    partSmile.visible = false;
                    partBody.visible = false;
                }
                break;
        }
        
        if (partState !== 'BEING_LIFTED' && partState !== 'BEING_PROCESSED' && partState !== 'BEING_PLACED') {
            part.position.set(partPosition.x, partPosition.y, partPosition.z);
        }
    }
    
    function updateManipulators() {
        manipulatorComponents.forEach((comp, index) => {
            if (comp.isProcessing) {
                comp.processTime += 0.016;
                
                const lowerTime = 1.0;
                const closeTime = 0.5;
                const liftTime = 0.8;
                const processTime = 1.5;
                const lowerAgainTime = 0.8;
                const openTime = 0.5;
                const returnTime = 0.8;
                
                const totalTime = lowerTime + closeTime + liftTime + processTime + 
                                  lowerAgainTime + openTime + returnTime;
                
                let elapsed = comp.processTime;
                
                if (elapsed < lowerTime) {
                    const progress = elapsed / lowerTime;
                    lowerGripper(comp, progress);
                }
                else if (elapsed < lowerTime + closeTime) {
                    const progress = (elapsed - lowerTime) / closeTime;
                    closeClaws(comp, progress);
                }
                else if (elapsed < lowerTime + closeTime + liftTime) {
                    const progress = (elapsed - lowerTime - closeTime) / liftTime;
                    liftGripperWithPart(comp, index, progress);
                    if (progress > 0.3 && partState === 'BEING_LIFTED') {
                        partState = 'BEING_PROCESSED';
                    }
                }
                else if (elapsed < lowerTime + closeTime + liftTime + processTime) {
                    const progress = (elapsed - lowerTime - closeTime - liftTime) / processTime;
                    processPartWithGripper(comp, index, progress);
                    if (progress > 0.3) {
                        applyModification(index);
                    }
                }
                else if (elapsed < lowerTime + closeTime + liftTime + processTime + lowerAgainTime) {
                    const progress = (elapsed - lowerTime - closeTime - liftTime - processTime) / lowerAgainTime;
                    lowerGripperWithPart(comp, index, progress);
                    if (progress > 0.5 && partState === 'BEING_PROCESSED') {
                        partState = 'BEING_PLACED';
                    }
                }
                else if (elapsed < totalTime - returnTime) {
                    const progress = (elapsed - lowerTime - closeTime - liftTime - processTime - lowerAgainTime) / openTime;
                    openClaws(comp, progress);
                }
                else if (elapsed < totalTime) {
                    const progress = (elapsed - (totalTime - returnTime)) / returnTime;
                    returnGripperToOriginal(comp, progress);
                }
                else {
                    comp.isProcessing = false;
                    part.position.set(partPosition.x, partPosition.y, partPosition.z);
                    if (index === 0) partState = 'MOVING_TO_SECOND';
                    else if (index === 1) partState = 'MOVING_TO_THIRD';
                    else partState = 'MOVING_TO_EXIT';
                }
            }
        });
    }
    
    function lowerGripper(comp, progress) {
        const gripper = comp.gripper;
        const easeProgress = easeInOutQuad(progress);
        
        const startY = 4.5;
        const targetY = GRIPPER_MIN_Y; // 最低高度，防止穿透
        
        gripper.position.y = startY + (targetY - startY) * easeProgress;
    }
    
    function closeClaws(comp, progress) {
        const gripper = comp.gripper;
        const easeProgress = easeInOutQuad(progress);
        
        // gripper.children[0] = 连接座
        // gripper.children[1] = 左钳子
        // gripper.children[2] = 右钳子
        
        const leftClaw = gripper.children[1];
        const rightClaw = gripper.children[2];
        
        // 左钳子：从张开到合拢
        const leftData = leftClaw.userData;
        leftClaw.position.x = leftData.originalX + (leftData.closedX - leftData.originalX) * easeProgress;
        leftClaw.rotation.z = leftData.originalRotationZ + (leftData.closedRotationZ - leftData.originalRotationZ) * easeProgress;
        
        // 右钳子：从张开到合拢
        const rightData = rightClaw.userData;
        rightClaw.position.x = rightData.originalX + (rightData.closedX - rightData.originalX) * easeProgress;
        rightClaw.rotation.z = rightData.originalRotationZ + (rightData.closedRotationZ - rightData.originalRotationZ) * easeProgress;
    }
    
    function liftGripperWithPart(comp, index, progress) {
        const gripper = comp.gripper;
        const easeProgress = easeInOutQuad(progress);
        
        const startY = GRIPPER_MIN_Y;
        const targetY = 4.0;
        
        gripper.position.y = startY + (targetY - startY) * easeProgress;
        
        // 物理同步：零件跟随抓爪
        const offset = 1.2; // 抓爪和零件之间的固定偏移
        const manipulatorWorldPos = new THREE.Vector3();
        manipulators[index].getWorldPosition(manipulatorWorldPos);
        
        part.position.set(
            manipulatorWorldPos.x,
            (manipulatorWorldPos.y + gripper.position.y) - offset,
            partPosition.z
        );
    }
    
    function processPartWithGripper(comp, index, progress) {
        const gripper = comp.gripper;
        const shakeAmount = 0.05;
        const shake = Math.sin(progress * Math.PI * 8) * shakeAmount;
        
        gripper.position.y = 4.0 + shake;
        
        // 物理同步
        const offset = 1.2;
        const manipulatorWorldPos = new THREE.Vector3();
        manipulators[index].getWorldPosition(manipulatorWorldPos);
        
        part.position.set(
            manipulatorWorldPos.x,
            (manipulatorWorldPos.y + gripper.position.y) - offset + shake,
            partPosition.z
        );
    }
    
    function lowerGripperWithPart(comp, index, progress) {
        const gripper = comp.gripper;
        const easeProgress = easeInOutQuad(progress);
        
        const startY = 4.0;
        const targetY = GRIPPER_MIN_Y;
        
        gripper.position.y = startY + (targetY - startY) * easeProgress;
        
        // 物理同步
        const offset = 1.2;
        const manipulatorWorldPos = new THREE.Vector3();
        manipulators[index].getWorldPosition(manipulatorWorldPos);
        
        part.position.set(
            manipulatorWorldPos.x,
            (manipulatorWorldPos.y + gripper.position.y) - offset,
            partPosition.z
        );
    }
    
    function openClaws(comp, progress) {
        const gripper = comp.gripper;
        const easeProgress = easeInOutQuad(progress);
        
        const leftClaw = gripper.children[1];
        const rightClaw = gripper.children[2];
        
        // 左钳子：从合拢到张开
        const leftData = leftClaw.userData;
        leftClaw.position.x = leftData.closedX + (leftData.originalX - leftData.closedX) * easeProgress;
        leftClaw.rotation.z = leftData.closedRotationZ + (leftData.originalRotationZ - leftData.closedRotationZ) * easeProgress;
        
        // 右钳子：从合拢到张开
        const rightData = rightClaw.userData;
        rightClaw.position.x = rightData.closedX + (rightData.originalX - rightData.closedX) * easeProgress;
        rightClaw.rotation.z = rightData.closedRotationZ + (rightData.originalRotationZ - rightData.closedRotationZ) * easeProgress;
    }
    
    function returnGripperToOriginal(comp, progress) {
        const gripper = comp.gripper;
        const easeProgress = easeInOutQuad(progress);
        
        const startY = GRIPPER_MIN_Y;
        const targetY = 4.5;
        
        gripper.position.y = startY + (targetY - startY) * easeProgress;
    }
    
    function updateCable(cable, gripperY) {
        // 关键修复：钢缆不要穿到机械手里面
        // 小车底部在 Y=9.5
        // 抓爪顶部在 Y=gripperY + 0.2（连接座高度的一半）
        
        const gripperTopY = gripperY + 0.2;
        const cableLength = TROLLEY_BOTTOM_Y - gripperTopY;
        
        if (cableLength < 0.1) return;
        
        // 更新钢缆缩放和位置
        // 原始钢缆长度是1
        cable.scale.y = cableLength;
        
        // 钢缆中心在小车底部和抓爪顶部中间
        const centerY = (TROLLEY_BOTTOM_Y + gripperTopY) / 2;
        cable.position.y = centerY;
    }
    
    function easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
    
    function applyModification(manipulatorIndex) {
        switch(manipulatorIndex) {
            case 0:
                if (!hasEars) {
                    hasEars = true;
                    partLeftEar.visible = true;
                    partRightEar.visible = true;
                }
                break;
            case 1:
                if (!hasSmile) {
                    hasSmile = true;
                    partSmile.visible = true;
                }
                break;
            case 2:
                if (!hasBody) {
                    hasBody = true;
                    partBody.visible = true;
                }
                break;
        }
    }
    
})();
