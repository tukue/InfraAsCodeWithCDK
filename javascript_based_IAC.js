const cdk = require('@aws-cdk/core');
const ec2 = require('@aws-cdk/aws-ec2');
const elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
const rds = require('@aws-cdk/aws-rds');

class MyStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', {
      cidr: '10.0.0.0/16'
    });

    const subnet = vpc.addSubnet('Subnet', {
      cidrBlock: '10.0.0.0/24'
    });

    const ig = new ec2.CfnInternetGateway(this, 'InternetGateway');

    new ec2.CfnVPCGatewayAttachment(this, 'VPCGatewayAttachment', {
      vpcId: vpc.vpcId,
      internetGatewayId: ig.ref
    });

    const routeTable = new ec2.CfnRouteTable(this, 'RouteTable', {
      vpcId: vpc.vpcId
    });

    new ec2.CfnRoute(this, 'Route', {
      routeTableId: routeTable.ref,
      destinationCidrBlock: '0.0.0.0/0',
      gatewayId: ig.ref
    });

    new ec2.CfnSubnetRouteTableAssociation(this, 'SubnetRouteTableAssociation', {
      subnetId: subnet.subnetId,
      routeTableId: routeTable.ref
    });

    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
      description: 'Allow HTTP and SSH access',
      allowAllOutbound: true   // default is true
    });

    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22));
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    securityGroup.addIngressRule(ec2.Peer.ipv4('10.0.0.0/16'), ec2.Port.tcp(3306));

    const lb = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc,
      internetFacing: true
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc,
      port: 80
    });

    lb.addListener('Listener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.forward([targetGroup])
    });

    // Add RDS instance here
    // const db = new rds.DatabaseInstance(this, 'Database', { ... });
    const db = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.MYSQL,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO),
      vpc,
      multiAz: false,
      allocatedStorage: 10,
      storageType: rds.StorageType.GP2,
      credentials: rds.Credentials.fromPassword('admin', cdk.SecretValue.plainText('password')),
      databaseName: 'mydatabase'
    });
  }
}

const app = new cdk.App();
new MyStack(app, 'MyStack');
app.synth();