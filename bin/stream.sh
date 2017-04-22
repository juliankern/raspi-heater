#! /bin/bash
# 1: WIDTH 
# 2: HEIGHT 
# 3: FPS 
# 4: BITRATE 
# 5: VIDEO_KEY 
# 6: targetAddress
# 7: targetVideoPort
#

raspivid -o - -w $1 -h $2 -fps $3 -b $(expr $4 \* 1000) | ffmpeg -re -f avfoundation -r 29.970000 -i 0:0 -threads 0 -vcodec libx264 -an -pix_fmt yuv420p -r $3 -f rawvideo -tune zerolatency -vf scale=$1:$2 -b:v $4k -bufsize $4k -payload_type 99 -ssrc 1 -f rtp -srtp_out_suite AES_CM_128_HMAC_SHA1_80 -srtp_out_params $5 srtp://$6:$7?rtcpport=$7&localrtcpport=$7&pkt_size=1378