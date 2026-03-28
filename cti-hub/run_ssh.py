import paramiko
import sys
import time

def run_command(host, port, username, password, command):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, port, username, password)
        # We might need an interactive shell for things like npm start, but let's try exec_command first
        stdin, stdout, stderr = client.exec_command(command, get_pty=True)
        
        # Read the output line by line as it is generated
        while True:
            line = stdout.readline()
            if not line:
                break
            print(line, end="")
            
        print(stderr.read().decode())
        exit_status = stdout.channel.recv_exit_status()
        print(f"Exit status: {exit_status}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ssh_script.py <command>")
        sys.exit(1)
        
    cmd = sys.argv[1]
    host = "76.13.96.107"
    port = 22
    username = "root"
    password = "Ay4BcpKedctPqIifLC'8"
    run_command(host, port, username, password, cmd)
