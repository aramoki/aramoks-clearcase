'use strict';
import { exec, spawn, ChildProcess, ExecException } from 'child_process';

export class ClearTool {
    greeting: string;



    constructor() {
        this.greeting = "message";
    }
 
    run_command(command:String , path:String ,c_error: (exception: ExecException, val: String) => void ,std_error: (val : string) => void , std_success: (val : string) => void){
        exec("cleartool "+ command + " " + path + "", (error, stdout, stderr) => {
            if (error) {
                c_error(error,stderr);
                return;
            }
            if (stderr) {
                std_error(stderr);
            } else {
                std_success(stdout);
            }
        });
    }
}
