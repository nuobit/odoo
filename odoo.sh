#!/bin/bash

APPNAME="Odoo"

SCRIPT_FILENAME=${0##*/}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ODOO_DIR="$SCRIPT_DIR"

BASE_DIR="$ODOO_DIR/.."

PYTHON_ENV="$BASE_DIR/pyvenv"

PIDFILE="$BASE_DIR/odoo.pid"
LOG_DIR="$BASE_DIR/log"
LOGERRFILE="$LOG_DIR/error.log"
LOGOUTFILE="$LOG_DIR/out.log"

ODOO_CMD="$PYTHON_ENV/bin/python $ODOO_DIR/odoo.py --config=$ODOO_DIR/openerp-server.conf"


killproc() {
    signal=$1
    pid=$2
    #echo "Sending: $signal..."
    kill $signal $pid >/dev/null 2>&1
    RETVAL=$?
    return $RETVAL
}

start() {
    echo -n "Starting $APPNAME: "
    if [ -e "${PIDFILE}" ] && (killproc -0 $(cat ${PIDFILE})); then
        echo "Already running."
        RETVAL=99
    else
        if [ $# -eq 2 ]; then
            echo "Update requested, $APPNAME started in foreground"
            $ODOO_CMD $2 $3
        else
            $ODOO_CMD 1>>"$LOGOUTFILE" 2>>"$LOGERRFILE" &
            echo "Started."
        fi
        RETVAL=0
    fi
    return $RETVAL
}

stop() {
    signal=$1
    echo -n "Stopping $APPNAME ($signal): "
    if [ -e "${PIDFILE}" ]; then
        PID=$(cat ${PIDFILE})
        if (killproc -0 $PID); then
            killproc $signal $PID
            while killproc -0 $PID; do
                sleep 1
            done
            echo "Stopped."
            RETVAL=0
        else
            echo "Not running."
            RETVAL=98
        fi
    else
        echo "Not running."
        RETVAL=98
    fi
    return $RETVAL
}

status() {
    echo -n "$APPNAME status: "
    if [ -e "${PIDFILE}" ]; then
        PID=$(cat ${PIDFILE})
        if (killproc -0 $PID); then
            echo "Running ($PID)."
        else
            echo "Stopped."
        fi
    else
        echo "Stopped."
    fi
    RETVAL=0
    return $RETVAL

}

usage() {
    echo "Usage:"
    echo -e "\t * $SCRIPT_FILENAME <start|restart|force-restart> [--database=<db_name> --update=<all | comma separated module/s without spaces>]"
    echo -e "\t * $SCRIPT_FILENAME <stop|force-stop|status>"
}


case "$1" in
    start|restart|force-restart)
        if [ $# -ne 1 ] && [ $# -ne 3 ]; then
            usage
            exit 1
        fi
        ;;
    status|stop|force-stop)
        if [ $# -ne 1 ]; then
            usage
            exit 1
        fi
        ;;
    *)
        usage
        exit 1
esac

case "$1" in
    start)
        start $2 $3
        ;;
    stop)
        stop -15
        ;;
    force-stop)
        stop -9
        ;;
    status)
        status
        ;;
    restart)
        stop -15
        start $2 $3
        ;;
    force-restart)
        stop -9
        start $2 $3
        ;;
esac
exit $RETVAL
