---
layout: post
title: 简单聊下 Java Agent
description: 在 SkyWalking 课程中有一小节讲到了 Java Agent，零代码侵入就能实现 JVM 层面的 AOP 增强的好技术。
---

JavaAgent 是 JDK 1.5 以后引入的，也可以叫做 Java 代理。  
JavaAgent 是运行在 main 方法之前的拦截器，它内定的方法名叫 premain()，也就是说先执行 premain() 然后再执行 main 方法。  

使用步骤：
- 定义一个 MANIFEST.MF 文件，在其中添加 premain-class 配置项。
- 创建 premain-class 配置项指定的类，并在其中实现 premain() 方法。
- 将 MANIFEST.MF 文件和 premain-class 指定的类一起打包成一个 jar 包。
- 使用 `-javaagent:` 指定该 jar 包的路径。

## 举个栗子

**agent-demo 工程**

必须提供的 premain() 方法。

```java
public class AgentDemo {
  public static void premain(String agentArgs, Instrumentation inst) throws Exception {
    System.out.println("premain(String agentArgs, Instrumentation inst)");
    System.out.println("参数:" + agentArgs);
    System.out.println("参数:" + inst);
  }
  public static void premain(String agentArgs) throws Exception {
    System.out.println("premain(String agentArgs)");
    System.out.println("参数:" + agentArgs);
  }
}
```
agent-demo 工程编译成 agent-demo.jar 之后。打开压缩包修改 MANIFEST.MF 文件。
```
Manifest-Version: 1.0
Archiver-Version: Plexus Archiver
Created-By: Apache Maven
Built-By: chenxinjie
Build-Jdk: 13.0.2
Specification-Title: agent-demo
Specification-Version: 0.0.1-SNAPSHOT
Implementation-Title: agent-demo
Implementation-Version: 0.0.1-SNAPSHOT
Implementation-Vendor-Id: cn.live
Can-Retransform-Classes: true
Premain-Class: cn.live.AgentDemo
```

**main-demo 工程**

写一个简单的 Java Application 方法，在命令行输出一段字符串。

``` java
public class MainDemo {
  public static void main(String[] args) throws Exception {
    System.out.println("MainDemo end");
  }
}
```

直接运行 Java Application，得到的结果是：

``` java
MainDemo end
```

当修改 VM arguments 参数，加上`-javaagent:"/Users/chenxinjie/GitHub/springboot-demo/agent-demo/target/agent-demo.jar=systemNo=main-demo"` 运行 Java Application，得到的结果是：

``` java
premain(String agentArgs, Instrumentation inst)
参数:systemNo=main-demo
参数:sun.instrument.InstrumentationImpl@5caf905d

MainDemo end
```

## 统计方法执行时间

```java
public java.lang.String cn.live.service.impl.DemoServiceImpl.hello(java.lang.String) hook :1004ms
public java.lang.String cn.live.controller.DemoController.hello() hook :3004ms
```

以上是 Java Agent 技术与 bytebuddy 工具，配合实现的统计方法执行时间功能。

**agent-demo 工程**

修改 premain() 方法，使用 bytebuddy 工具动态生产 Agent。

```java
AgentBuilder.Transformer transformer = new AgentBuilder.Transformer() {
  @Override
  public Builder<?> transform(Builder<?> arg0, TypeDescription arg1, ClassLoader arg2,
      JavaModule arg3) {
    return arg0.method(ElementMatchers.any())
        .intercept(MethodDelegation.to(TimeInterceptor.class));
  }
};

new AgentBuilder.Default().type(ElementMatchers.nameStartsWith("cn.live"))
  .transform(transformer).installOn(inst);
```

新增 `TimeInterceptor.java` 类。

``` java
@RuntimeType
public static Object intercept(@Origin Method method, @SuperCall Callable<?> callable) throws Exception {
  long start = System.currentTimeMillis();
  try {
    return callable.call(); // 执行方法
  } finally {
    System.out.println(method + " hook :" + (System.currentTimeMillis() - start) + "ms");
  }
}
```

- 记录方法运行之前的时间 start
- 执行方法并返回
- finally 中计算消耗的时间差并输出字符串

## 小结

感到万分尴尬，如此优秀的 Java Agent 从来都没有关注过！

本文主要通过两个案例来了解 Java Agent 技术，顺便提出两个问题：Java Agent、bytebuddy 到底是怎么样的一个实现原理？有什么优秀的开源案例？
