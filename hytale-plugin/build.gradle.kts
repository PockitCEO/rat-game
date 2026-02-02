plugins {
    id("java")
}

group = "com.pockitceo"
version = "1.0.0"

repositories {
    mavenCentral()
}

dependencies {
    // Hytale Server API (place HytaleServer.jar in libs/)
    compileOnly(files("libs/HytaleServer.jar"))
    
    testImplementation(platform("org.junit:junit-bom:5.10.0"))
    testImplementation("org.junit.jupiter:junit-jupiter")
}

tasks.test {
    useJUnitPlatform()
}

tasks.jar {
    archiveFileName.set("RatGameBridge.jar")
}
