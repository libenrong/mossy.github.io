# 02 · 启动与 JVM

## 启动脚本：`/start.sh`

容器实际执行的脚本（完整注释版）：

```bash
#!/bin/bash
# Leaf 26.2 转启（校了桶启）
openjdk25="/home/container/graalvm-25.2.4+7.1/bin/java"
cd /home/container

# 首次/面板更新后解包 Leaf 核心附带数据包（一次性，解完自删）
if [ -f /home/container/leaf-core.tar.gz ]; then
  echo "[leaf] extracting core and datapacks ..."
  tar -xzf /home/container/leaf-core.tar.gz -C /home/container/
  rm -f /home/container/leaf-core.tar.gz
  echo "[leaf] done"
fi

cd /home/container
exec "${openjdk25}" \
  -Xms16G -Xmx16G \
  <JVM flags 见下> \
  -jar leaf-26.2-123.jar -nogui
```

要点：
- **Java 是 GraalVM 25**，不是 Temurin。GraalVM 的 JIT 对启动期吞吐有加成；`-DPaper.IgnoreJavaVersion=true` 用来绕过 Paper 对非 LTS/非认定版本的硬检查。
- `leaf-core.tar.gz` 是面板分发核心时的压缩包，解出 jar + 附带数据包后自删。**如果误放了这个文件，下次启动会覆盖根目录内容**——更新核心时留意。
- `-nogui`：无 Swing 控制台（容器里也起不来）。

## JVM 参数分层

### 堆与触碰

| 参数 | 值 | 说明 |
|---|---|---|
| `-Xms` / `-Xmx` | 16G / 16G | 固定堆，避免动态伸缩抖动 |
| `-XX:+AlwaysPreTouch` | — | 启动时把 16G 全部页预摸一遍，运行期免缺页 |

### GC：G1 + Aikar's Flags

```
-XX:+UseG1GC
-XX:G1HeapRegionSize=16M          # 16G 堆 / 1024 区，16M 区大小匹配
-XX:G1HeapWastePercent=5
-XX:G1MaxNewSizePercent=40
-XX:G1MixedGCCountTarget=4
-XX:G1MixedGCLiveThresholdPercent=90
-XX:G1NewSizePercent=5
-XX:G1RSetUpdatingPauseTimePercent=5
-XX:G1ReservePercent=20
-XX:InitiatingHeapOccupancyPercent=45
-XX:MaxGCPauseMillis=200
-XX:+ParallelRefProcEnabled
-XX:+DisableExplicitGC            # 忽略 System.gc()
-XX:+PerfDisableSharedMem         # 避免 /tmp hsperfdata 性能干扰
-XX:+UnlockExperimentalVMOptions
-Dusing.aikars.flags=https://mcflags.emc.gs
-Daikars.new.flags=true
```

这是标准 Aikar's G1 调参（社区为 Minecraft 服务端调的），目标是 200ms 内的 GC 停顿。`G1HeapRegionSize=16M`、`MaxNewSizePercent=40` 是 16G 堆下的合理值；**如果以后调堆大小，这两项要联动改**。

### GC 日志

```
-Xlog:gc*:file=/home/container/logs/gc.log:time,uptime,level,tags:filecount=5,filesize=10M
```

5 个 10MB 轮转文件，即 `/logs/gc.log`、`gc.log.0` … `gc.log.4`。排查卡顿先看这里有没有长停顿。

### 安全/网络

| 参数 | 说明 |
|---|---|
| `-Djava.security.egd=file:/dev/urandom` | SecureRandom 走 urandom，避免容器 /dev/random 阻塞 |
| `-Dio.netty.leakDetection.level=disabled` | 关 netty 泄漏检测（有性能开销；线上一般关） |
| `-Dterminal.jline=false` | 容器无 TTY，关行编辑 |
| `-Dpaper.disableWorldSymlinkValidation=true` | 允许世界目录用软链（某些主机挂载需要） |

### Leaf 专有开关

| 参数 | 作用 |
|---|---|
| `-DLeaf.library-download-repo=https://maven.aliyun.com/repository/public` | 依赖下载走阿里云镜像（国内主机必要） |
| `-DLeaf.enable-io-uring=true` | Linux io_uring 异步 IO（需内核 ≥5.6；本主机可用） |
| `-DLeaf.disable-vanilla-profiler=true` | 关原版 profiler |
| `-DLeaf.disable-vanilla-debug-feature=true` | 关原版 debug 特性（F3 相关服务端逻辑） |
| `-DLeaf.disableMethodProfiler=true` | 关方法级 profiler |
| `-DLeaf.disableDebug=true` | Leaf 调试输出 |
| `-DLeaf.enableFMA=true` | 启用 FMA 指令相关优化 |
| `-Dspark.viewerUrl=https://libenrong.github.io/spark.github.io/` | spark 性能分析报告的查看器地址（自建页面） |

## 启动顺序（Leaf 视角）

1. 解包 `leaf-core.tar.gz`（若存在）
2. 读 `/config.yml`，**写回** `bukkit.yml`、`spigot.yml`、`config/paper-*.yml`、`config/leaf-*.yml`、`config/gale-*.yml`
3. 加载 `server.properties`
4. 注册世界（Multiverse 接管）——此时若数据包 zip 缺 `pack.mcmeta`，对应维度创建失败
5. 加载 `plugins/` 下全部 jar
6. 输出 `Done (xs)`，开始 tick

## 启动失败的常见点

| 现象 | 原因 | 处置 |
|---|---|---|
| 卡在解 tar | `leaf-core.tar.gz` 损坏 | 删掉该文件重启（jar 已在则无需 tar） |
| `Missing metadata in pack file` | 数据包 zip 无根级 pack.mcmeta | 见 [06-数据包手册](06-数据包手册.md) 事故复盘 |
| `WORLD_CREATOR_FAILED` | 某世界创建失败（常因数据包） | 修包 → 重启；失败世界目录会残留空壳 |
| Hikari 连接风暴刷屏 | 远程 MySQL（CoreProtect/Slimefun）瞬断 | 见 [10-故障排查](10-故障排查与已知问题.md) |
| GraalVM 报 version 不认 | 未带 `-DPaper.IgnoreJavaVersion=true` | 确认 start.sh 未被面板重置 |

## 文档变更记录

- 2026-10-11：初版。
